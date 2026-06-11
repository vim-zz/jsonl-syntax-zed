use zed_extension_api as zed;

struct JsonlExtension;

impl zed::Extension for JsonlExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        _worktree: &zed::Worktree,
    ) -> zed::Result<zed::Command> {
        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![
                "-e".to_string(),
                include_str!("../server/jsonl-lsp.js").to_string(),
            ],
            env: Vec::new(),
        })
    }
}

zed::register_extension!(JsonlExtension);
