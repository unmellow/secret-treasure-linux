#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(target_os = "linux")]
    linux_audio_env();

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Secret Treasure");
}

#[cfg(target_os = "linux")]
fn linux_audio_env() {
    // AppImage AppRun (linuxdeploy GTK hook) exports
    // GST_PLUGIN_SYSTEM_PATH_1_0=$APPDIR/usr/lib/gstreamer-1.0 which does not
    // exist when bundleMediaFramework is false. That hides host plugins and
    // mutes WebKit. The ELF never sets these, so it has sound.
    for k in [
        "GST_PLUGIN_SYSTEM_PATH",
        "GST_PLUGIN_SYSTEM_PATH_1_0",
        "GST_PLUGIN_PATH",
        "GST_PLUGIN_PATH_1_0",
        "GST_PLUGIN_SCANNER",
        "GST_PLUGIN_SCANNER_1_0",
    ] {
        unsafe { std::env::remove_var(k) };
    }
    if std::path::Path::new("/usr/lib/gstreamer-1.0").is_dir() {
        unsafe { std::env::set_var("GST_PLUGIN_SYSTEM_PATH_1_0", "/usr/lib/gstreamer-1.0") };
    } else if std::path::Path::new("/usr/lib64/gstreamer-1.0").is_dir() {
        unsafe { std::env::set_var("GST_PLUGIN_SYSTEM_PATH_1_0", "/usr/lib64/gstreamer-1.0") };
    }

    // Keep WebKitGTK sandbox on. Disabling it (WEBKIT_DISABLE_SANDBOX*) is
    // dangerous and must not be the default. If Unity WebAudio is muted under
    // the sandbox, prefer mute-with-sandbox over re-enabling sandbox-off.

    if let Ok(dir) = std::env::var("XDG_RUNTIME_DIR") {
        let pulse = format!("{dir}/pulse/native");
        if std::env::var_os("PULSE_SERVER").is_none() && std::path::Path::new(&pulse).exists() {
            unsafe { std::env::set_var("PULSE_SERVER", format!("unix:{pulse}")) };
        }
        if std::path::Path::new(&format!("{dir}/pipewire-0")).exists() {
            unsafe { std::env::set_var("PIPEWIRE_RUNTIME_DIR", &dir) };
        }
    }
}
