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
    cmd.arg("--data-binary").arg(format!("@{}", file.to_string_lossy())).arg(url)
        .creation_flags(NO_WINDOW);
    let out = cmd.output();
    let _ = fs::remove_file(&file);
    let out = out.map_err(|e| e.to_string())?;
    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }
    serde_json::from_slice::<Value>(&out.stdout).map_err(|e| e.to_string())
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

pub fn reply(provider: &str, model: &str, api_key: &str, system: &str, prompt: &str, lang: &str) -> Result<String, String> {
    let language = if lang == "en" { "English" } else { "Portuguese (Brazil)" };
    let system = format!("{system}\nReply in {language} with 1 or 2 short sentences (max 180 characters). Be kind, safe for a Twitch stream, stay in character. Never mention being an AI.");
    match provider {
        "ollama" => {
            let url = "http://127.0.0.1:11434/api/chat";
            let body = json!({
                "model": if model.is_empty() { "llama3.2" } else { model },
                "stream": false,
                "messages": [{ "role": "system", "content": system }, { "role": "user", "content": prompt }],
                "options": { "num_predict": 80 }
            });
            text_of(&curl_json(url, &[], &body)?, "ollama").ok_or_else(|| "resposta vazia".into())
        }
        "gemini" => {
            if api_key.is_empty() { return Err("sem API key".into()); }
            let model = if model.is_empty() { "gemini-2.0-flash" } else { model };
            let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}");
            let body = json!({
                "contents": [{ "parts": [{ "text": format!("{system}\n\n{prompt}") }] }],
                "generationConfig": { "maxOutputTokens": 80 }
            });
            text_of(&curl_json(&url, &[], &body)?, "gemini").ok_or_else(|| "resposta vazia".into())
        }
        _ => {
            if api_key.is_empty() { return Err("sem API key".into()); }
            let url = if model.starts_with("http") { model.to_string() } else { "https://api.openai.com/v1/chat/completions".into() };
            let headers = vec![format!("Authorization: Bearer {api_key}")];
            let body = json!({
                "model": if model.starts_with("http") { "gpt-4o-mini" } else { model },
                "max_tokens": 80,
                "messages": [{ "role": "system", "content": system }, { "role": "user", "content": prompt }]
            });
            text_of(&curl_json(&url, &headers, &body)?, "openai").ok_or_else(|| "resposta vazia".into())
        }
    }
}
