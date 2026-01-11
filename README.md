# GitLab Review MCP Server
MCP server umożliwiający GitHub Copilotowi wykonywanie code review Merge Requestów z GitLab (self-hosted).
## Wymagania
- Node.js >= 18.0.0
- GitLab instance (self-hosted lub GitLab.com)
- GitLab Personal Access Token z uprawnieniami: `api`, `read_api`, `write_repository`
## Instalacja
```bash
npm install
```
## Konfiguracja
Ustaw zmienne środowiskowe:
```bash
export GITLAB_BASE_URL="https://gitlab.example.com"
export GITLAB_TOKEN="your-gitlab-personal-access-token"
```
## Budowanie
```bash
npm run build
```
## Uruchomienie
```bash
npm start
# lub
node dist/index.js
```
## Narzędzia MCP
### 1. get_merge_request
Pobiera szczegóły merge requesta.
**Input:**
- `project_id` (string) - ID projektu lub ścieżka (np. "group/project" lub "123")
- `mr_iid` (number) - IID merge requesta
**Output:**
- `title` - tytuł MR
- `description` - opis MR
- `state` - stan (opened, merged, closed)
- `author` - informacje o autorze
- `web_url` - link do MR
### 2. get_merge_request_diff
Pobiera diff/zmiany w merge requeście.
**Input:**
- `project_id` (string) - ID projektu lub ścieżka
- `mr_iid` (number) - IID merge requesta
**Output:**
- `files` - lista zmienionych plików z diffami
### 3. post_merge_request_comment
Dodaje komentarz do merge requesta.
**Input:**
- `project_id` (string) - ID projektu lub ścieżka
- `mr_iid` (number) - IID merge requesta
- `body` (string) - treść komentarza (Markdown)
**Output:**
- `comment_id` - ID utworzonego komentarza
- `created_at` - data utworzenia

### 4. post_merge_request_inline_comment
Dodaje komentarz inline do konkretnej linii w pliku w ramach merge requesta. Rozpoczyna dyskusję w wybranym miejscu kodu.

**Input:**
- `project_id` (string) - ID projektu lub ścieżka
- `mr_iid` (number) - IID merge requesta
- `body` (string) - treść komentarza (Markdown)
- `file_path` (string) - ścieżka do pliku (np. 'src/index.ts')
- `line_number` (number) - numer linii w pliku
- `line_type` (string, opcjonalny) - 'new' (domyślnie) lub 'old'

**Output:**
- `comment_id` - ID utworzonego komentarza
- `created_at` - data utworzenia
- `file_path` - ścieżka do pliku
- `line_number` - numer linii
- `line_type` - typ linii (new/old)

### 5. save_review_file
Pobiera diff z MR i tworzy plik review z możliwością dodawania komentarzy.

**Input:**
- `workspace_root` (string) - Ścieżka do workspace (np. '/Users/user/project')
- `project_id` (string) - ID projektu lub ścieżka
- `mr_iid` (number) - IID merge requesta

**Output:**
- `success` - czy operacja się powiodła
- `review_file_path` - ścieżka do utworzonego pliku review
- `message` - informacja o kolejnych krokach

**Opis:** Tworzy katalog `.gitlab_review/` (automatycznie dodawany do `.gitignore`) i zapisuje plik `mr-{iid}-review.md` zawierający diff i szablon do komentarzy w formacie `[COMMENT]...[/COMMENT]`.

### 6. publish_review_comments
Wysyła zaakceptowane komentarze z pliku review do GitLab.

**Input:**
- `review_file_path` (string) - Ścieżka do pliku review
- `project_id` (string) - ID projektu lub ścieżka
- `mr_iid` (number) - IID merge requesta

**Output:**
- `success` - czy operacja się powiodła
- `published` - liczba wysłanych komentarzy
- `skipped` - liczba pominiętych komentarzy (ACCEPT=false)
- `errors` - liczba błędów podczas wysyłania

**Opis:** Parsuje plik review, znajduje wszystkie bloki `[COMMENT]` i wysyła tylko te z `ACCEPT=true` jako inline comments do GitLab.

## Review Workflow

Nowy workflow do code review (szczegóły w `REVIEW_WORKFLOW.md`):

1. **Pobierz diff:** `save_review_file` tworzy `.gitlab_review/mr-{iid}-review.md`
2. **Dodaj komentarze:** Edytuj plik, dodaj bloki `[COMMENT]` z `ACCEPT=true/false`
3. **Wyślij:** `publish_review_comments` publikuje zaakceptowane komentarze

**Format komentarzy:** Zobacz szczegółową specyfikację w `FORMAT_SPEC.md`

**Przykład użycia:**
```
"Pobierz diff z MR 42 projektu group/project do pliku review (workspace: /Users/user/project)"
"Wyślij komentarze z pliku .gitlab_review/mr-42-review.md do MR 42"
```

## Dokumentacja

- **FORMAT_SPEC.md** - szczegółowa specyfikacja formatu pliku review ⭐
- **REVIEW_WORKFLOW.md** - workflow i przykłady użycia
- **INLINE_COMMENTS.md** - dokumentacja inline comments
- **QUICKSTART.md** - przewodnik szybkiego startu
- **STATUS.md** - status projektu

## Konfiguracja w GitHub Copilot
Dodaj do konfiguracji MCP (np. w VS Code settings lub claude_desktop_config.json):
```json
{
  "mcpServers": {
    "gitlab-review": {
      "command": "node",
      "args": ["/Users/arek/dev/gitlab_review_mcp/dist/index.js"],
      "env": {
        "GITLAB_BASE_URL": "https://gitlab.example.com",
        "GITLAB_TOKEN": "your-token-here"
      }
    }
  }
}
```
## Przykład użycia
Po skonfigurowaniu, Copilot może używać tych narzędzi np.:
```
"Zrób review merge requesta 42 w projekcie my-group/my-project"
```
Copilot automatycznie:
1. Pobierze szczegóły MR (`get_merge_request`)
2. Pobierze zmiany/diff (`get_merge_request_diff`)
3. Przeanalizuje kod
4. Może dodać komentarz z review (`post_merge_request_comment`)
5. Może dodać komentarze inline w konkretnych miejscach (`post_merge_request_inline_comment`)
## Logowanie
## Struktura projektu

```
gitlab_review_mcp/
├── src/
│   └── index.ts                # Główny kod serwera MCP
├── dist/                       # Skompilowane pliki (generowane)
│   ├── index.js                # Plik wykonywalny
│   ├── index.d.ts              # TypeScript declarations
│   └── *.map                   # Source maps
├── package.json                # Konfiguracja npm
├── tsconfig.json               # Konfiguracja TypeScript
├── README.md                   # Ten plik - główna dokumentacja
├── QUICKSTART.md               # Przewodnik szybkiego startu
├── STATUS.md                   # Status projektu i szczegóły
├── .env.example                # Przykład konfiguracji ENV
├── mcp-config.example.json     # Przykład konfiguracji MCP
├── verify.js                   # Skrypt weryfikacji instalacji
├── test.sh                     # Skrypt testowy
└── .gitignore                  # Git ignore rules
```
