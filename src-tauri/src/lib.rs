#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    {
        // WebKitGTK's bubblewrap sandbox blocks Pulse/PipeWire, so Unity
        // WebAudio is silent. Only set these if the user has not already.
        for (k, v) in [
            ("WEBKIT_DISABLE_SANDBOX", "1"),
            ("WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS", "1"),
        ] {
            if std::env::var_os(k).is_none() {
                unsafe { std::env::set_var(k, v) };
            }
        }
        if std::env::var_os("PULSE_SERVER").is_none() {
            if let Ok(dir) = std::env::var("XDG_RUNTIME_DIR") {
                let native = format!("{dir}/pulse/native");
                if std::path::Path::new(&native).exists() {
                    unsafe { std::env::set_var("PULSE_SERVER", format!("unix:{native}")) };
                }
            }
        }
    }

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Secret Treasure");
}
