// Geldfluss – Verbindung zu deiner Supabase-Datenbank
// Trag hier die zwei Werte aus Supabase ein (Project Settings → API).
// Beide dürfen öffentlich sein: Wer deine Daten sehen will, braucht trotzdem dein Login.
window.GELDFLUSS_CONFIG = {
  supabaseUrl: "",   // z. B. "https://abcdefgh.supabase.co"
  supabaseKey: ""    // der „publishable“ bzw. „anon“ Key, beginnt mit sb_publishable_ oder eyJ…
};
