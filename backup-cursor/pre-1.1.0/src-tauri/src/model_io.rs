// Reading and importing Yes Steve Model (YSM) sources: an exported folder or a .zip of one.

use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
};

const MAX_DEPTH: usize = 4;

struct Entry {
    path: String,
    bytes: Vec<u8>,
}

pub struct Model {
    pub name: String,
    pub kind: &'static str,
    pub meta: Option<Value>,
    pub geometry_file: String,
    pub geometry: Value,
    pub animations: Vec<(String, Value)>,
    pub textures: Vec<(String, Vec<u8>)>,
}

fn basename(p: &str) -> String {
    p.rsplit(['/', '\\']).next().unwrap_or(p).to_string()
}

fn wanted(name: &str) -> bool {
    let n = name.to_lowercase();
    n.ends_with(".json") || n.ends_with(".png")
}

fn walk(dir: &Path, rel: &str, depth: usize, out: &mut Vec<Entry>) -> Result<(), String> {
    for e in fs::read_dir(dir).map_err(|e| format!("{}: {e}", dir.display()))?.flatten() {
        let name = e.file_name().to_string_lossy().into_owned();
        let path = e.path();
        let rel_path = if rel.is_empty() { name.clone() } else { format!("{rel}/{name}") };
        if path.is_dir() {
            if depth < MAX_DEPTH {
                walk(&path, &rel_path, depth + 1, out)?;
            }
        } else if wanted(&name) {
            out.push(Entry { path: rel_path, bytes: fs::read(&path).map_err(|e| e.to_string())? });
        }
    }
    Ok(())
}

fn read_zip(path: &Path) -> Result<Vec<Entry>, String> {
    let file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipArchive::new(file).map_err(|e| format!("zip inválido: {e}"))?;
    let mut out = Vec::new();
    for i in 0..zip.len() {
        let mut f = zip.by_index(i).map_err(|e| e.to_string())?;
        if !f.is_file() || !wanted(f.name()) {
            continue;
        }
        let mut bytes = Vec::new();
        f.read_to_end(&mut bytes).map_err(|e| e.to_string())?;
        out.push(Entry { path: f.name().to_string(), bytes });
    }
    Ok(out)
}

fn read_entries(path: &Path) -> Result<(Vec<Entry>, &'static str), String> {
    if path.is_dir() {
        let mut out = Vec::new();
        walk(path, "", 0, &mut out)?;
        return Ok((out, "folder"));
    }
    match path.extension().and_then(|e| e.to_str()).map(str::to_lowercase).as_deref() {
        Some("zip") => Ok((read_zip(path)?, "zip")),
        _ => Err("Formato não suportado. Escolha a pasta exportada do modelo ou um .zip dela.".into()),
    }
}

fn anim_order(name: &str) -> u8 {
    match name {
        "main.animation.json" => 0,
        "extra.animation.json" => 1,
        _ => 2,
    }
}

pub fn load(path: &Path) -> Result<Model, String> {
    let (entries, kind) = read_entries(path)?;
    let mut meta = None;
    let mut geometries: Vec<(String, Value)> = Vec::new();
    let mut animations: Vec<(String, Value)> = Vec::new();
    let mut textures: Vec<(String, Vec<u8>)> = Vec::new();

    for e in entries {
        let base = basename(&e.path);
        let lower = base.to_lowercase();
        if lower.ends_with(".png") {
            textures.push((base, e.bytes));
            continue;
        }
        let Ok(v) = serde_json::from_slice::<Value>(&e.bytes) else { continue };
        if lower == "ysm.json" {
            meta = Some(v);
        } else if v.get("minecraft:geometry").is_some() {
            geometries.push((base, v));
        } else if v.get("animations").is_some() && !lower.starts_with("arm") && !lower.starts_with("tac") {
            animations.push((base, v));
        }
    }

    geometries.sort_by_key(|(n, _)| (n.to_lowercase() != "main.json", n.to_lowercase().starts_with("arm")));
    let (geometry_file, geometry) = geometries.into_iter().next().ok_or("Nenhuma geometria (main.json) encontrada.")?;
    animations.sort_by_key(|(n, _)| (anim_order(&n.to_lowercase()), n.clone()));
    textures.sort_by_key(|(n, _)| {
        let l = n.to_lowercase();
        (l != "texture.png", !l.contains("default"), n.clone())
    });
    if textures.is_empty() {
        return Err("Nenhuma textura .png encontrada.".into());
    }

    let meta_name = meta
        .as_ref()
        .and_then(|m| m.pointer("/metadata/name").or_else(|| m.get("name")))
        .and_then(Value::as_str)
        .map(str::to_string);
    let file_name = path.file_stem().map(|s| s.to_string_lossy().into_owned()).unwrap_or_else(|| "Modelo".into());

    Ok(Model {
        name: meta_name.unwrap_or(file_name),
        kind,
        meta,
        geometry_file,
        geometry,
        animations,
        textures,
    })
}

fn data_url(bytes: &[u8]) -> String {
    format!("data:image/png;base64,{}", STANDARD.encode(bytes))
}

fn png_size(bytes: &[u8]) -> (u32, u32) {
    if bytes.len() >= 24 && &bytes[1..4] == b"PNG" {
        let w = u32::from_be_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]);
        let h = u32::from_be_bytes([bytes[20], bytes[21], bytes[22], bytes[23]]);
        (w, h)
    } else {
        (0, 0)
    }
}

impl Model {
    /// Payload the renderer builds the pet from.
    pub fn render_data(&self, texture: Option<&str>) -> Value {
        let tex = texture
            .and_then(|t| self.textures.iter().find(|(n, _)| n == t))
            .unwrap_or(&self.textures[0]);
        json!({
            "geometry": self.geometry,
            "animations": self.animations.iter().map(|(_, v)| v).collect::<Vec<_>>(),
            "texture": data_url(&tex.1),
        })
    }

    /// Summary shown in the import window.
    pub fn info(&self, source: &Path) -> Value {
        let geo = self.geometry.pointer("/minecraft:geometry/0").cloned().unwrap_or(Value::Null);
        let bones = geo["bones"].as_array().map(Vec::len).unwrap_or(0);
        let cubes: usize = geo["bones"]
            .as_array()
            .map(|b| b.iter().map(|x| x["cubes"].as_array().map(Vec::len).unwrap_or(0)).sum())
            .unwrap_or(0);
        let files: Vec<Value> = self
            .animations
            .iter()
            .map(|(n, v)| {
                let names: Vec<String> = v["animations"].as_object().map(|o| o.keys().cloned().collect()).unwrap_or_default();
                json!({ "file": n, "names": names })
            })
            .collect();
        let total: usize = files.iter().map(|f| f["names"].as_array().map(Vec::len).unwrap_or(0)).sum();
        let authors: Vec<String> = self
            .meta
            .as_ref()
            .and_then(|m| m.pointer("/metadata/authors"))
            .and_then(Value::as_array)
            .map(|a| {
                a.iter()
                    .filter_map(|x| x.as_str().map(str::to_string).or_else(|| x["name"].as_str().map(str::to_string)))
                    .collect()
            })
            .unwrap_or_default();
        json!({
            "name": self.name,
            "source": source.display().to_string(),
            "kind": self.kind,
            "geometryFile": self.geometry_file,
            "textureUnits": [geo.pointer("/description/texture_width"), geo.pointer("/description/texture_height")],
            "bones": bones,
            "cubes": cubes,
            "animationFiles": files,
            "animationCount": total,
            "authors": authors,
            "textures": self.textures.iter().map(|(n, b)| {
                let (w, h) = png_size(b);
                json!({ "name": n, "width": w, "height": h, "data": data_url(b) })
            }).collect::<Vec<_>>(),
        })
    }

    /// Copies the model into `models_dir/<safe name>` in the layout the app loads.
    pub fn install(&self, models_dir: &Path, name: &str, texture: Option<&str>) -> Result<PathBuf, String> {
        let safe: String = name
            .chars()
            .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
            .collect();
        let safe = if safe.trim_matches('_').is_empty() { "modelo".to_string() } else { safe };
        let dir = models_dir.join(&safe);
        if dir.exists() {
            fs::remove_dir_all(&dir).map_err(|e| e.to_string())?;
        }
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let write_json = |file: &str, v: &Value| {
            fs::write(dir.join(file), serde_json::to_vec(v).unwrap_or_default()).map_err(|e| e.to_string())
        };
        write_json("main.json", &self.geometry)?;
        for (n, v) in &self.animations {
            write_json(n, v)?;
        }
        if let Some(meta) = &self.meta {
            write_json("ysm.json", meta)?;
        }
        let chosen = texture.and_then(|t| self.textures.iter().position(|(n, _)| n == t)).unwrap_or(0);
        fs::write(dir.join("texture.png"), &self.textures[chosen].1).map_err(|e| e.to_string())?;
        Ok(dir)
    }
}
