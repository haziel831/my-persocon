// Listens to what the PC is playing (WASAPI loopback) and streams loudness, frequency bands,
// beats and tempo to the renderer as "audio" events (~30 per second).
//
// Audio callbacks run on a real-time thread: no allocation, no blocking and no Tauri calls there.
// The analyzer only touches a fixed pre-allocated state and hands results to the control thread
// through a small bounded channel (dropped when the UI cannot keep up).

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{sync_channel, RecvTimeoutError, SyncSender};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

static ON: AtomicBool = AtomicBool::new(false);
static RUNNING: AtomicBool = AtomicBool::new(false);

const INTERVALS: usize = 12;

#[derive(Serialize, Clone)]
struct AudioOut {
    level: f32,
    bass: f32,
    mid: f32,
    high: f32,
    beat: bool,
    bpm: f32,
}

struct Analyzer {
    sr: f32,
    channels: usize,
    // Pre-computed one-pole coefficients (bass, low-mid, high split).
    cb: f32,
    cl: f32,
    ch: f32,
    lp_bass: f32,
    lp_lo: f32,
    lp_hi: f32,
    acc: [f32; 4],
    n: usize,
    window: usize,
    t: f32,
    avg_bass: f32,
    last_beat: f32,
    intervals: [f32; INTERVALS],
    ilen: usize,
    iidx: usize,
    tx: SyncSender<AudioOut>,
}

fn coef(fc: f32, sr: f32) -> f32 {
    1.0 - (-2.0 * std::f32::consts::PI * fc / sr).exp()
}

impl Analyzer {
    fn new(sr: f32, channels: usize, tx: SyncSender<AudioOut>) -> Self {
        let sr = if sr > 0.0 { sr } else { 48_000.0 };
        Self {
            sr,
            channels: channels.max(1),
            cb: coef(150.0, sr),
            cl: coef(300.0, sr),
            ch: coef(3000.0, sr),
            lp_bass: 0.0,
            lp_lo: 0.0,
            lp_hi: 0.0,
            acc: [0.0; 4],
            n: 0,
            window: ((sr / 30.0) as usize).max(1),
            t: 0.0,
            avg_bass: 0.0,
            last_beat: 0.0,
            intervals: [0.0; INTERVALS],
            ilen: 0,
            iidx: 0,
            tx,
        }
    }

    // One mono sample: accumulate the four bands, flush when the window closes.
    #[inline]
    fn push(&mut self, x: f32) {
        self.lp_bass += self.cb * (x - self.lp_bass);
        self.lp_lo += self.cl * (x - self.lp_lo);
        self.lp_hi += self.ch * (x - self.lp_hi);
        let mid = self.lp_hi - self.lp_lo;
        let high = x - self.lp_hi;
        self.acc[0] += x * x;
        self.acc[1] += self.lp_bass * self.lp_bass;
        self.acc[2] += mid * mid;
        self.acc[3] += high * high;
        self.n += 1;
        if self.n >= self.window {
            self.flush();
        }
    }

    // Interleaved frames of any sample type: averages the channels of each frame (streaming,
    // no temporary Vec) and feeds the mono result.
    fn feed<T: Copy>(&mut self, data: &[T], to_f32: impl Fn(T) -> f32) {
        let channels = self.channels;
        for frame in data.chunks_exact(channels) {
            let mut sum = 0.0;
            for &s in frame {
                sum += to_f32(s);
            }
            self.push(sum / channels as f32);
        }
    }

    fn intervals_push(&mut self, dt: f32) {
        self.intervals[self.iidx] = dt;
        self.iidx = (self.iidx + 1) % INTERVALS;
        if self.ilen < INTERVALS {
            self.ilen += 1;
        }
    }

    fn flush(&mut self) {
        let n = self.n as f32;
        let [level, bass, mid, high] = self.acc.map(|a| (a / n).sqrt());
        self.acc = [0.0; 4];
        self.n = 0;
        self.t += n / self.sr;
        let beat = bass > self.avg_bass * 1.35 && bass > 0.01 && self.t - self.last_beat > 0.28;
        self.avg_bass = self.avg_bass * 0.95 + bass * 0.05;
        if beat {
            let dt = self.t - self.last_beat;
            if (0.3..1.5).contains(&dt) {
                self.intervals_push(dt);
            }
            self.last_beat = self.t;
        }
        let bpm = if self.ilen >= 3 {
            // Copy to the stack and sort with total_cmp: NaN cannot panic, and no allocation.
            let mut v = [0.0f32; INTERVALS];
            v[..self.ilen].copy_from_slice(&self.intervals[..self.ilen]);
            let v = &mut v[..self.ilen];
            v.sort_unstable_by(f32::total_cmp);
            60.0 / v[v.len() / 2]
        } else {
            0.0
        };
        // Never blocks: if the UI is behind, this frame is simply dropped.
        let _ = self.tx.try_send(AudioOut { level, bass, mid, high, beat, bpm });
    }
}

fn run(app: AppHandle) -> Result<(), String> {
    let device = cpal::default_host().default_output_device().ok_or("sem saída de áudio")?;
    let config = device.default_output_config().map_err(|e| e.to_string())?;
    let sr = config.sample_rate().0 as f32;
    let (tx, rx) = sync_channel::<AudioOut>(4);
    let mut an = Analyzer::new(sr, config.channels() as usize, tx);
    let stream_config: cpal::StreamConfig = config.clone().into();
    let err = |e| eprintln!("audio: {e}");
    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => {
            device.build_input_stream(&stream_config, move |d: &[f32], _: &_| an.feed(d, |s| s), err, None)
        }
        cpal::SampleFormat::I16 => device.build_input_stream(
            &stream_config,
            move |d: &[i16], _: &_| an.feed(d, |s| s as f32 / 32_768.0),
            err,
            None,
        ),
        cpal::SampleFormat::I32 => device.build_input_stream(
            &stream_config,
            move |d: &[i32], _: &_| an.feed(d, |s| s as f32 / 2_147_483_648.0),
            err,
            None,
        ),
        cpal::SampleFormat::U16 => device.build_input_stream(
            &stream_config,
            move |d: &[u16], _: &_| an.feed(d, |s| (s as f32 - 32_768.0) / 32_768.0),
            err,
            None,
        ),
        f => return Err(format!("formato de áudio não suportado: {f:?}")),
    }
    .map_err(|e| e.to_string())?;
    stream.play().map_err(|e| e.to_string())?;

    // Control thread: drains the channel and emits to the renderer, outside the audio callback.
    while ON.load(Ordering::Relaxed) {
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(out) => {
                let _ = app.emit("audio", out);
            }
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => break,
        }
    }
    drop(stream);
    Ok(())
}

pub fn listen(app: AppHandle, value: bool) {
    ON.store(value, Ordering::Relaxed);
    if value && !RUNNING.swap(true, Ordering::Relaxed) {
        thread::spawn(move || {
            if let Err(e) = run(app) {
                eprintln!("audio: {e}");
            }
            RUNNING.store(false, Ordering::Relaxed);
        });
    }
}
