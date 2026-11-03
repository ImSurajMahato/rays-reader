# RaysReader (security-audit clone)

Single-file clone of the RaysBook "Secure Reader" viewer, built as part of the owner-sanctioned security review of books.streamfiles.eu.org.

- Fetches the site's own public, unauthenticated endpoints directly (CORS `*`): `books.php`, `page_count.php`, `page.php`.
- Decrypts the XOR-obfuscated page payloads client-side (key recovered during the audit) and renders with pdf.js (`isEvalSupported: false`, CVE-2024-4367 mitigation).
- Zero auth, zero tokens: demonstrates that the viewer's copy protection is cosmetic.
