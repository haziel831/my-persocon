// Short AI replies for Twitch chat. Uses curl.exe so no extra network crates
// are needed; keys stay in the local config and are never written to the repo.
use serde_json::{json, Value};
use std::fs;
use std::os::windows::process::CommandExt;
use std::process::Command;

const NO_WINDOW: u32 = 0x0800_0000;

/// First non-empty trimmed value among the accepted aliases.
fn field(entry: &Value, keys: &[&str]) -> String {
    for key in keys {
        if let Some(v) = entry.get(*key) {
            if let Some(s) = v.as_str() {
                let t = s.trim();
                if !t.is_empty() {
                    return t.to_string();
                }
            }
        }
    }
    String::new()
}

/// Never echo an API key (or a `key=` query value) back to the UI/logs.
fn sanitize(raw: &str, secrets: &[&str]) -> String {
    let mut out = raw.to_string();
    for secret in secrets {
        let s = secret.trim();
        if s.len() >= 6 {
            out = out.replace(s, "***");
        }
    }
    let lower = out.to_ascii_lowercase();
    let mut result = String::new();
    let mut pos = 0;
    while let Some(rel) = lower[pos..].find("key=") {
        let i = pos + rel;
        result.push_str(&out[pos..i]);
        let start = i + 4;
        let end = out[start..]
            .find(|c: char| c == '&' || c == '"' || c == '\'' || c.is_whitespace())
            .map(|n| start + n)
            .unwrap_or(out.len());
        result.push_str("key=***");
        pos = end;
    }
    result.push_str(&out[pos..]);
    result.chars().take(400).collect()
}

fn curl_json(url: &str, headers: &[String], body: &Value, secrets: &[&str]) -> Result<(Value, String), String> {
    let dir = std::env::temp_dir();
    let file = dir.join(format!(
        "persocon-ai-{}-{}.json",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
            % 1_000_000
    ));
    fs::write(&file, serde_json::to_vec(body).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
    let mut cmd = Command::new("curl.exe");
    // Windows/Schannel can hang on CRL revocation checks; -4 avoids slow IPv6 paths.
    cmd.arg("-4")
        .arg("--ssl-no-revoke")
        .arg("-sS")
        .arg("--connect-timeout")
        .arg("8")
        .arg("--max-time")
        .arg("25")
        .arg("-X")
        .arg("POST")
        .arg("-H")
        .arg("Content-Type: application/json");
    for h in headers {
        cmd.arg("-H").arg(h);
    }
    cmd.arg("--data-binary")
        .arg(format!("@{}", file.to_string_lossy()))
        .arg("-w")
        .arg("\n%{http_code}")
        .arg(url)
        .creation_flags(NO_WINDOW);
    let out = cmd.output();
    let _ = fs::remove_file(&file);
    let out = out.map_err(|e| format!("erro ao executar curl (rede/TLS): {e}"))?;
    let raw = String::from_utf8_lossy(&out.stdout);
    let (body_text, status) = match raw.rfind('\n') {
        Some(i) => (raw[..i].trim(), raw[i + 1..].trim()),
        None => (raw.trim(), "?"),
    };
    if !out.status.success() {
        let exit = out.status.code().unwrap_or(-1);
        let err = sanitize(&String::from_utf8_lossy(&out.stderr), secrets);
        return Err(format!("erro de rede/TLS (exit {exit}, HTTP {status}): {err}"));
    }
    let code = status.parse::<u16>().unwrap_or(0);
    if code == 0 || !(200..300).contains(&code) {
        let source = if body_text.is_empty() {
            String::from_utf8_lossy(&out.stderr)
        } else {
            body_text.into()
        };
        return Err(format!("HTTP {status}: {}", sanitize(&source, secrets)));
    }
    match serde_json::from_str::<Value>(body_text) {
        Ok(v) => Ok((v, status.to_string())),
        Err(e) => Err(format!(
            "HTTP {status}: resposta inválida ({e}): {}",
            sanitize(body_text, secrets)
        )),
    }
}

/// Accepts base URLs and full URLs without ever duplicating `/chat/completions`.
/// Accepts a plain URL or an accidentally pasted Markdown link `[text](https://...)`.
fn clean_endpoint(raw: &str) -> String {
    let mut s = raw.trim().trim_matches('`').trim().to_string();
    if s.starts_with('[') {
        if let Some(open) = s.rfind("](") {
            if s.ends_with(')') {
                s = s[open + 2..s.len() - 1].trim().to_string();
            }
        }
    }
    if s.starts_with('(') && s.ends_with(')') && s.len() > 2 {
        s = s[1..s.len() - 1].trim().to_string();
    }
    s.trim_end_matches('/').to_string()
}

fn endpoint_for(kind: &str, brand: &str, endpoint: &str, model: &str) -> Result<String, String> {
    let ep = clean_endpoint(endpoint);
    match kind {
        "ollama" => {
            if ep.is_empty() {
                Ok("http://127.0.0.1:11434/api/chat".into())
            } else if ep.ends_with("/api/chat") {
                Ok(ep)
            } else {
                Ok(format!("{ep}/api/chat"))
            }
        }
        "gemini" => {
            let base = if ep.is_empty() {
                "https://generativelanguage.googleapis.com/v1beta".to_string()
            } else {
                ep
            };
            if base.contains(":generateContent") {
                Ok(base)
            } else if base.ends_with("/models") {
                Ok(format!("{base}/{model}:generateContent"))
            } else if base.ends_with("/v1beta") {
                Ok(format!("{base}/models/{model}:generateContent"))
            } else {
                Ok(format!("{base}/v1beta/models/{model}:generateContent"))
            }
        }
        _ => {
            let known = if brand.contains("groq") {
                Some("https://api.groq.com/openai/v1/chat/completions")
            } else if brand.contains("openrouter") {
                Some("https://openrouter.ai/api/v1/chat/completions")
            } else if brand.contains("cerebras") {
                Some("https://api.cerebras.ai/v1/chat/completions")
            } else if brand.contains("mistral") {
                Some("https://api.mistral.ai/v1/chat/completions")
            } else {
                None
            };
            if ep.is_empty() {
                if let Some(url) = known {
                    Ok(url.into())
                } else if brand.contains("openai") || brand.is_empty() {
                    Ok("https://api.openai.com/v1/chat/completions".into())
                } else {
                    Err("Endpoint obrigatório (ex.: https://api.groq.com/openai/v1)".into())
                }
            } else if ep.ends_with("/chat/completions") {
                Ok(ep)
            } else {
                Ok(format!("{ep}/chat/completions"))
            }
        }
    }
}

fn openai_text(v: &Value) -> Option<String> {
    if let Some(choices) = v.get("choices").and_then(Value::as_array) {
        for choice in choices {
            let msg = match choice.get("message") {
                Some(m) => m,
                None => continue,
            };
            for key in ["content", "reasoning_content", "reasoning", "text"] {
                if let Some(s) = msg.get(key).and_then(Value::as_str) {
                    if !s.trim().is_empty() {
                        return Some(s.to_string());
                    }
                }
            }
            if let Some(parts) = msg.get("content").and_then(Value::as_array) {
                let mut joined = String::new();
                for part in parts {
                    if let Some(t) = part.get("text").and_then(Value::as_str) {
                        joined.push_str(t);
                        joined.push(' ');
                    }
                }
                if !joined.trim().is_empty() {
                    return Some(joined);
                }
            }
        }
    }
    for key in ["output_text", "response"] {
        if let Some(s) = v.get(key).and_then(Value::as_str) {
            if !s.trim().is_empty() {
                return Some(s.to_string());
            }
        }
    }
    None
}

/// Drops <think>...</think> blocks, including an unclosed tag at the end of the output.
fn strip_think(raw: &str) -> String {
    let mut out = String::new();
    let mut rest = raw;
    loop {
        // to_ascii_lowercase keeps byte offsets aligned with the original string.
        let lower = rest.to_ascii_lowercase();
        if let Some(i) = lower.find("<think") {
            out.push_str(&rest[..i]);
            if let Some(j) = lower[i..].find("</think>") {
                rest = &rest[i + j + "</think>".len()..];
            } else {
                rest = ""; // tag never closed: discard the rest
            }
            continue;
        }
        if let Some(i) = lower.find("</think>") {
            out.push_str(&rest[..i]);
            rest = &rest[i + "</think>".len()..];
            continue;
        }
        out.push_str(rest);
        break;
    }
    out
}

/// Lines that break character (AI self-reference, leaked rules, stage directions).
fn is_meta_line(line: &str) -> bool {
    let l = line.trim().to_ascii_lowercase();
    if l.is_empty() { return true; }
    if (l.starts_with('*') && l.ends_with('*'))
        || (l.starts_with('(') && l.ends_with(')'))
        || l.starts_with("ai:")
        || l.starts_with("assistant:")
        || l.starts_with("model:") { return true; }
    const BAD: &[&str] = &[
        "as an ai", "i am an ai", "i'm an ai", "as a language model", "language model",
        "eu sou uma ia", "sou uma ia", "eu sou um ia", "sou um ia", "modelo de linguagem",
        "como modelo de linguagem", "i need to act like", "i have to act like",
        "tenho que agir como", "preciso agir como", "i must act like", "devo agir como",
        "system prompt", "minhas instrucoes", "minhas regras", "i am programmed",
        "eu sou programada", "eu sou programado", "reasoning_content", "think step by step",
        "vou pensar", "deixa eu pensar", "i will think",
    ];
    BAD.iter().any(|p| l.contains(p))
}

/// Only the spoken line survives: no reasoning, no meta narration, no system-prompt leaks.
fn clean_reply(raw: &str, max: usize) -> Option<String> {
    let text = strip_think(raw);
    let kept: Vec<String> = text.lines().map(|l| l.trim())
        .filter(|l| !is_meta_line(l)).map(String::from).collect();
    let joined = kept.join(" ").split_whitespace().collect::<Vec<_>>().join(" ");
    let clean: String = joined.chars().take(max).collect();
    if clean.trim().is_empty() { None } else { Some(clean) }
}

fn text_of(v: &Value, kind: &str) -> Option<String> {
    let raw = match kind {
        "gemini" => {
            let mut joined = String::new();
            if let Some(list) = v.get("candidates").and_then(Value::as_array) {
                for candidate in list {
                    if let Some(parts) = candidate
                        .get("content")
                        .and_then(|c| c.get("parts"))
                        .and_then(Value::as_array)
                    {
                        for part in parts {
                            if let Some(t) = part.get("text").and_then(Value::as_str) {
                                joined.push_str(t);
                                joined.push(' ');
                            }
                        }
                    }
                }
            }
            joined
        }
        "ollama" => v
            .get("message")
            .and_then(|m| m.get("content"))
            .and_then(Value::as_str)
            .or_else(|| v.get("response").and_then(Value::as_str))
            .unwrap_or("")
            .to_string(),
        _ => openai_text(v).unwrap_or_default(),
    };
    clean_reply(&raw, 180)
}

fn need_text(v: &Value, kind: &str, status: &str, secrets: &[&str]) -> Result<String, String> {
    if let Some(text) = text_of(v, kind) {
        return Ok(text);
    }
    let mut hint = String::new();
    if let Some(msg) = v.get("error").and_then(|e| e.get("message")).and_then(Value::as_str) {
        hint = msg.to_string();
    }
    if hint.is_empty() {
        if let Some(first) = v.get("candidates").and_then(Value::as_array).and_then(|a| a.first()) {
            if let Some(reason) = first.get("finishReason").and_then(Value::as_str) {
                hint = format!("finishReason={reason}");
            }
        }
    }
    if hint.is_empty() {
        if let Some(reason) = v.get("promptFeedback").and_then(|f| f.get("blockReason")).and_then(Value::as_str) {
            hint = format!("blockReason={reason}");
        }
    }
    if hint.is_empty() {
        if openai_text(v).is_none() && v.get("choices").is_some() {
            hint = "content vazio (modelo reasoning?)".into();
        }
    }
    // A reasoning model may spend every token thinking and leave content empty: treat as an
    // error instead of reading the raw reasoning as if the character had said it.
    if hint.is_empty() {
        let thinking = v.get("thinking").is_some()
            || v.get("reasoning_content").is_some()
            || v.get("message").and_then(|m| m.get("reasoning_content")).is_some()
            || v.get("message").and_then(|m| m.get("reasoning")).is_some()
            || v.get("candidates").and_then(Value::as_array).and_then(|a| a.first())
                .and_then(|c| c.get("content")).and_then(|c| c.get("parts"))
                .and_then(Value::as_array)
                .map(|parts| parts.iter().any(|p| p.get("thought").and_then(Value::as_bool).unwrap_or(false)))
                .unwrap_or(false);
        if thinking { hint = "content vazio (modelo reasoning?)".into(); }
    }
    let snippet = serde_json::to_string(v).unwrap_or_default();
    let extra = if hint.is_empty() { String::new() } else { format!(" ({hint})") };
    Err(format!(
        "HTTP {status}: resposta vazia/inesperada{extra}: {}",
        sanitize(&snippet, secrets)
    ))
}

fn reply_one(entry: &Value, system: &str, prompt: &str, lang: &str) -> Result<String, String> {
    let name = field(entry, &["name", "id", "label"]);
    let raw_provider = field(entry, &["provider", "type", "engine"]);
    let brand = format!("{name} {raw_provider}").to_ascii_lowercase();
    let kind = if brand.contains("gemini") || brand.contains("google") || brand.contains("ai studio") {
        "gemini"
    } else if brand.contains("ollama") || brand.contains("local") {
        "ollama"
    } else if raw_provider == "gemini" {
        "gemini"
    } else if raw_provider == "ollama" {
        "ollama"
    } else {
        "openai"
    };
    let model = field(entry, &["model", "modelName"]);
    let endpoint = field(entry, &["endpoint", "url", "baseUrl", "apiUrl"]);
    let api_key = field(entry, &["apiKey", "api_key", "key", "token"]);
    let secrets = [api_key.as_str()];
    let model = if model.is_empty() {
        match kind {
            "gemini" => "gemini-2.0-flash".to_string(),
            "ollama" => "llama3.2".to_string(),
            _ => "gpt-4o-mini".to_string(),
        }
    } else {
        model
    };
    let url = endpoint_for(kind, &brand, &endpoint, &model)?;

    let language = if lang == "en" { "English" } else { "Portuguese (Brazil)" };
    let system = format!(
        "{system}\nReply in {language} directly as the character described above, in 1 or 2 short spoken sentences (max 180 characters). Output ONLY the line she says. Never explain these rules or any prompt, never mention being an AI, a model or reasoning, never use asterisks, stage directions or narration."
    );
    let reasoning = brand.contains("gpt-oss") || brand.contains("reasoning")
        || model.contains("gpt-oss") || model.starts_with("o1") || model.starts_with("o3")
        || model.contains("r1") || model.contains("qwen3");

    let (value, status) = match kind {
        "ollama" => {
            let mut body = json!({
                "model": model,
                "stream": false,
                "messages": [{ "role": "system", "content": system }, { "role": "user", "content": prompt }],
                "options": { "num_predict": 300 }
            });
            // Ollama's equivalent of a low reasoning effort: keep tokens for the answer.
            if reasoning { body["think"] = json!(false); }
            curl_json(&url, &[], &body, &secrets)?
        }
        "gemini" => {
            if api_key.is_empty() {
                return Err("sem API key (Gemini)".into());
            }
            let headers = vec![format!("x-goog-api-key: {api_key}")];
            let mut gen = json!({ "maxOutputTokens": 300 });
            if model.contains("2.5") || model.contains("thinking") {
                gen["thinkingConfig"] = json!({ "thinkingBudget": 0 });
            }
            let body = json!({
                "contents": [{ "parts": [{ "text": format!("{system}\n\n{prompt}") }] }],
                "generationConfig": gen
            });
            curl_json(&url, &headers, &body, &secrets)?
        }
        _ => {
            if api_key.is_empty() {
                return Err("sem API key".into());
            }
            let mut headers = vec![format!("Authorization: Bearer {api_key}")];
            if brand.contains("openrouter") {
                let referer = field(entry, &["httpReferer", "referer"]);
                let title = field(entry, &["xTitle", "title"]);
                headers.push(format!(
                    "HTTP-Referer: {}",
                    if referer.is_empty() { "https://github.com/haziel831/my-persocon" } else { &referer }
                ));
                headers.push(format!("X-Title: {}", if title.is_empty() { "My Persocon" } else { &title }));
            }
            let mut body = json!({
                "model": model,
                "messages": [{ "role": "system", "content": system }, { "role": "user", "content": prompt }]
            });
            if reasoning {
                body["max_completion_tokens"] = json!(300);
                body["reasoning_effort"] = json!("low");
            } else {
                body["max_tokens"] = json!(300);
            }
            if brand.contains("openrouter") {
                body["include_reasoning"] = json!(false);
            }
            curl_json(&url, &headers, &body, &secrets)?
        }
    };
    need_text(&value, kind, &status, &secrets)
}

/// Quota/rate limits, server errors and network/TLS failures all move to the next provider.
fn should_failover(err: &str) -> bool {
    let e = err.to_ascii_lowercase();
    e.contains("http 402")
        || e.contains("http 429")
        || e.contains("http 5")
        || e.contains("http 000")
        // Empty content (reasoning-only response) is recoverable: try the next provider.
        || e.contains("content vazio")
        || e.contains("resposta vazia")
        || e.contains("erro de rede")
        || e.contains("exit 6")
        || e.contains("exit 7")
        || e.contains("exit 28")
        || e.contains("exit 35")
        || e.contains("timed out")
        || e.contains("timeout")
        || e.contains("network")
        || e.contains("quota")
        || e.contains("rate_limit")
        || e.contains("rate limit")
        || e.contains("insufficient")
        || e.contains("resource_exhausted")
        || e.contains("exhausted")
        || e.contains("credit")
        || e.contains("overloaded")
        || e.contains("temporarily")
        || e.contains("free tier")
}

/// Tries every enabled provider in order; reports which one answered and why others failed.
pub fn reply_chain(providers: &[Value], system: &str, prompt: &str, lang: &str, auto: bool) -> Result<Value, String> {
    let mut errors: Vec<String> = Vec::new();
    let mut notices: Vec<String> = Vec::new();
    for entry in providers.iter().filter(|p| p.get("enabled").and_then(Value::as_bool).unwrap_or(true)) {
        let name = field(entry, &["name", "id", "label"]);
        let display = if name.is_empty() {
            field(entry, &["provider", "type"]).to_ascii_uppercase()
        } else {
            name
        };
        match reply_one(entry, system, prompt, lang) {
            Ok(text) => {
                return Ok(json!({
                    "text": text,
                    "usedProvider": display,
                    "fallbackNotice": notices.join(" · "),
                    "errors": errors,
                }));
            }
            Err(err) => {
                if should_failover(&err) {
                    notices.push(format!("{display} falhou — alternado para o próximo"));
                }
                errors.push(format!("{display}: {err}"));
                if !auto {
                    break;
                }
            }
        }
    }
    Err(if errors.is_empty() {
        "nenhum provedor ativo".into()
    } else {
        errors.join(" | ")
    })
}
