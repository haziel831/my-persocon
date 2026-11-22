// Short AI replies for Twitch chat. Uses curl.exe so no extra network crates
// are needed; keys stay in the local config and are never written to the repo.
use serde_json::{json, Value};
use std::fs;
use std::process::Command;
use std::os::windows::process::CommandExt;

const NO_WINDOW: u32 = 0x0800_0000;

fn curl_json(url: &str, headers: &[String], body: &Value) -> Result<Value, String> {
    let dir = std::env::temp_dir();
    let file = dir.join(format!("persocon-ai-{}-{}.json", std::process::id(), std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos() % 1_000_000));
    fs::write(&file, serde_json::to_vec(body).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let mut cmd = Command::new("curl.exe");
    cmd.arg("-sS").arg("--max-time").arg("10").arg("-X").arg("POST")
        .arg("-H").arg("Content-Type: application/json");
    for h in headers { cmd.arg("-H").arg(h); }
    cmd.arg("--data-binary").arg(format!("@{}", file.to_string_lossy()))
        .arg("-w").arg("\n%{http_code}")
        .arg(url)
        .creation_flags(NO_WINDOW);
    let out = cmd.output();
    let _ = fs::remove_file(&file);
    let out = out.map_err(|e| e.to_string())?;
    let raw = String::from_utf8_lossy(&out.stdout);
    let (body, status) = match raw.rfind('\n') {
        Some(i) => (raw[..i].trim(), raw[i + 1..].trim()),
        None => (raw.trim(), "?"),
    };
    let detail = |s: &str| {
        let mut d = if s.is_empty() { String::from("sem detalhe da API") } else { s.to_string() };
        if let Some(i) = d.find("key=") {
            let end = d[i + 4..].find('&').map(|n| i + 4 + n).unwrap_or(d.len());
            d.replace_range(i + 4..end, "***");
        }
        format!("HTTP {status}: {d}")
    };
    if !out.status.success() || (status != "200" && status != "?") {
        return Err(detail(&String::from_utf8_lossy(&out.stderr)));
    }
    serde_json::from_str::<Value>(body).map_err(|_| detail(body))
}

fn text_of(v: &Value, provider: &str) -> Option<String> {
    let text = match provider {
        "ollama" => v.get("message")?.get("content")?.as_str()?.to_string(),
        "gemini" => v.get("candidates")?.get(0)?.get("content")?.get("parts")?.get(0)?.get("text")?.as_str()?.to_string(),
        _ => v.get("choices")?.get(0)?.get("message")?.get("content")?.as_str()?.to_string(),
    };
    let clean = text.trim().replace(['\n', '\r'], " ");
    let clean = clean.chars().take(180).collect::<String>();
    if clean.is_empty() { None } else { Some(clean) }
}

fn need_text(v: &Value, provider: &str) -> Result<String, String> {
    text_of(v, provider).ok_or_else(|| {
        let snippet = serde_json::to_string(v).unwrap_or_default();
        format!("resposta vazia ou inesperada: {}", &snippet[..snippet.len().min(180)])
    })
}

fn reply_one(entry: &Value, system: &str, prompt: &str, lang: &str) -> Result<String, String> {
    let language = if lang == "en" { "English" } else { "Portuguese (Brazil)" };
    let system = format!("{system}\nReply in {language} with 1 or 2 short sentences (max 180 characters). Be kind, safe for a Twitch stream, stay in character. Never mention being an AI.");
    let provider = entry.get("provider").and_then(Value::as_str).unwrap_or("ollama");
    let model = entry.get("model").and_then(Value::as_str).unwrap_or("").trim().to_string();
    let endpoint = entry.get("endpoint").and_then(Value::as_str).unwrap_or("").trim().to_string();
    let api_key = entry.get("apiKey").and_then(Value::as_str).unwrap_or("");
    match provider {
        "ollama" => {
            let url: String = if endpoint.is_empty() { "http://127.0.0.1:11434/api/chat".to_string() } else { endpoint.clone() };
            let body = json!({
                "model": if model.is_empty() { "llama3.2".to_string() } else { model.clone() },
                "stream": false,
                "messages": [{ "role": "system", "content": system }, { "role": "user", "content": prompt }],
                "options": { "num_predict": 80 }
            });
            need_text(&curl_json(&url, &[], &body)?, "ollama")
        }
        "gemini" => {
            if api_key.is_empty() { return Err("sem API key".into()); }
            let model: String = if model.is_empty() { "gemini-2.0-flash".to_string() } else { model.clone() };
            let url: String = if endpoint.is_empty() {
                format!("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}")
            } else { format!("{endpoint}?key={api_key}") };
            let body = json!({
                "contents": [{ "parts": [{ "text": format!("{system}\n\n{prompt}") }] }],
                "generationConfig": { "maxOutputTokens": 80 }
            });
            need_text(&curl_json(&url, &[], &body)?, "gemini")
        }
        _ => {
            if api_key.is_empty() { return Err("sem API key".into()); }
            let url: String = if endpoint.is_empty() { "https://api.openai.com/v1/chat/completions".to_string() } else { endpoint };
            let headers = vec![format!("Authorization: Bearer {api_key}")];
            let body = json!({
                "model": if model.is_empty() { "gpt-4o-mini".to_string() } else { model.clone() },
                "max_tokens": 80,
                "messages": [{ "role": "system", "content": system }, { "role": "user", "content": prompt }]
            });
            need_text(&curl_json(&url, &headers, &body)?, "openai")
        }
    }
}

fn is_quota_error(err: &str) -> bool {
    let e = err.to_ascii_lowercase();
    e.contains("402") || e.contains("429") || e.contains("quota") || e.contains("rate_limit")
        || e.contains("insufficient") || e.contains("resource_exhausted") || e.contains("credit")
        || e.contains("limit")
}

/// Tries every enabled provider in order; reports which one answered and why others failed.
pub fn reply_chain(providers: &[Value], system: &str, prompt: &str, lang: &str, auto: bool) -> Result<Value, String> {
    let mut errors: Vec<String> = Vec::new();
    let mut notice = String::new();
    for entry in providers.iter().filter(|p| p.get("enabled").and_then(Value::as_bool).unwrap_or(true)) {
        let name = entry.get("name").and_then(Value::as_str).unwrap_or("IA").to_string();
        match reply_one(entry, system, prompt, lang) {
            Ok(text) => {
                return Ok(json!({
                    "text": text,
                    "usedProvider": name,
                    "fallbackNotice": notice,
                    "errors": errors,
                }));
            }
            Err(err) => {
                errors.push(format!("{name}: {err}"));
                if is_quota_error(&err) {
                    notice = format!("{name} sem tokens/cota — tentando o próximo");
                }
                if !auto { break; }
            }
        }
    }
    Err(if errors.is_empty() { "nenhum provedor ativo".into() } else { errors.join(" | ") })
}


