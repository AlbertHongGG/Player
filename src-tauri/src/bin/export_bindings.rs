fn main() {
    let out_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("src/types/bindings.ts");

    anime_player_lib::create_builder()
        .export(
            specta_typescript::Typescript::default(),
            out_path,
        )
        .expect("Failed to export specta types");
}
