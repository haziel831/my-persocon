// Listens to what the PC is playing (WASAPI loopback) and streams loudness, frequency bands,
// beats and tempo to the renderer as "audio" events (~30 per second).

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

static ON: AtomicBool = AtomicBool::new(false);
static RUNNING: AtomicBool = AtomicBool::new(false);

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
    lp_bass: f32,
    lp_lo: f32,
    lp_hi: f32,
    acc: [f32; 4],
    n: usize,
    window: usize,
    t: f32,
    avg_bass: f32,
    last_beat: f32,
    intervals: Vec<f32>,
    app: AppHandle,
}

fn coef(fc: f32, sr: f32) -> f32 {
    1.0 - (-2.0 * std::f32::consts::PI * fc / sr).exp()
}

impl Analyzer {
    fn feed(&mut self, data: &[f32]) {
        let (cb, cl, ch) = (coef(150.0, self.sr), coef(300.0, self.sr), coef(3000.0, self.sr));
        for frame in data.chunks(self.channels) {
            let x = frame.iter().sum::<f32>() / frame.len() as f32;
            self.lp_bass += cb * (x - self.lp_bass);
            self.lp_lo += cl * (x - self.lp_lo);
            self.lp_hi += ch * (x - self.lp_hi);
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
                self.intervals.push(dt);
                if self.intervals.len() > 12 {
                    self.intervals.remove(0);
                }
            }
            self.last_beat = self.t;
        }
        let bpm = if self.intervals.len() >= 3 {
            let mut v = self.intervals.clone();
            v.sort_by(|a, b| a.partial_cmp(b).unwrap());
            60.0 / v[v.len() / 2]
        } else {
            0.0
        };
        let _ = self.app.emit("audio", AudioOut { level, bass, mid, high, beat, bpm });
    }
}

fn run(app: AppHandle) -> Result<(), String> {
    let device = cpal::default_host().default_output_device().ok_or("sem saída de áudio")?;
    let config = device.default_output_config().map_err(|e| e.to_string())?;
    let sr = config.sample_rate().0 as f32;
    let mut an = Analyzer {
        sr,
        channels: config.channels() as usize,
        lp_bass: 0.0,
        lp_lo: 0.0,
        lp_hi: 0.0,
        acc: [0.0; 4],
        n: 0,
        window: (sr / 30.0) as usize,
        t: 0.0,
        avg_bass: 0.0,
        last_beat: 0.0,
        intervals: Vec::new(),
        app,
    };
    let err = |e| eprintln!("audio: {e}");
    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => device.build_input_stream(&config.into(), move |d: &[f32], _: &_| an.feed(d), err, None),
        cpal::SampleFormat::I16 => device.build_input_stream(
            &config.into(),
            move |d: &[i16], _: &_| an.feed(&d.iter().map(|&s| s as f32 / 32768.0).collect::<Vec<_>>()),
            err,
            None,
        ),
        f => return Err(format!("formato de áudio não suportado: {f:?}")),
    }
    .map_err(|e| e.to_string())?;
    stream.play().map_err(|e| e.to_string())?;
    while ON.load(Ordering::Relaxed) {
        thread::sleep(Duration::from_millis(100));
    }
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
