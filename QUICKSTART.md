## Szybki start - GitLab Review MCP Server

### 1. Instalacja i budowanie

```bash
cd /Users/arek/dev/gitlab_review_mcp
npm install
npm run build
```

### 2. Konfiguracja zmiennych środowiskowych

Utwórz plik `.env` lub ustaw zmienne:

```bash
export GITLAB_BASE_URL="https://gitlab.example.com"
export GITLAB_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"
```

**Jak uzyskać GitLab Token:**
1. Zaloguj się do GitLab
2. Przejdź do: User Settings > Access Tokens
3. Utwórz token z uprawnieniami: `api`, `read_api`, `write_repository`
4. Skopiuj token (nie będziesz mógł go zobaczyć ponownie!)

### 3. Test lokalny (opcjonalny)

Możesz przetestować server lokalnie:

```bash
export GITLAB_BASE_URL="https://gitlab.example.com"
export GITLAB_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"
node dist/index.js
```

Server MCP uruchomi się i będzie czekał na komunikację przez stdin/stdout.
Naciśnij Ctrl+C aby przerwać.

### 4. Konfiguracja w GitHub Copilot / Claude Desktop

#### Dla Claude Desktop:
Edytuj plik `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gitlab-review": {
      "command": "node",
      "args": ["/Users/arek/dev/gitlab_review_mcp/dist/index.js"],
      "env": {
        "GITLAB_BASE_URL": "https://gitlab.example.com",
        "GITLAB_TOKEN": "glpat-xxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

#### Dla VS Code / GitHub Copilot:
Dodaj do settings.json:

```json
{
  "github.copilot.advanced": {
    "mcpServers": {
      "gitlab-review": {
        "command": "node",
        "args": ["/Users/arek/dev/gitlab_review_mcp/dist/index.js"],
        "env": {
          "GITLAB_BASE_URL": "https://gitlab.example.com",
          "GITLAB_TOKEN": "glpat-xxxxxxxxxxxxxxxxxxxx"
        }
      }
    }
  }
}
```

### 5. Restart aplikacji

- **Claude Desktop**: Zamknij i uruchom ponownie aplikację
- **VS Code**: Reload window (Cmd+Shift+P > "Developer: Reload Window")

### 6. Użycie

Po skonfigurowaniu możesz używać Copilota do code review:

**Przykładowe polecenia:**
- "Zrób review merge requesta 42 w projekcie my-group/my-project"
- "Pokaż zmiany w MR 15 dla projektu 123"
- "Dodaj komentarz do MR 10 w projekcie team/backend: 'LGTM, świetna robota!'"
- "Dodaj komentarz inline w pliku src/index.ts na linii 50 w MR 10: 'Tutaj powinien być error handling'"

**Dostępne narzędzia:**
1. `get_merge_request` - pobiera szczegóły MR
2. `get_merge_request_diff` - pobiera zmiany/diff
3. `post_merge_request_comment` - dodaje komentarz ogólny
4. `post_merge_request_inline_comment` - dodaje komentarz inline w konkretnej linii kodu

### Rozwiązywanie problemów

**Server nie działa:**
- Sprawdź czy zmienne środowiskowe są poprawnie ustawione
- Sprawdź czy token ma odpowiednie uprawnienia
- Sprawdź logi w konsoli aplikacji (Claude Desktop / VS Code)

**Błędy autoryzacji:**
- Zweryfikuj czy GITLAB_BASE_URL jest prawidłowy (bez końcowego /)
- Sprawdź czy token nie wygasł
- Upewnij się że token ma uprawnienia: `api`, `read_api`, `write_repository`

**Nie widzisz narzędzi MCP:**
- Upewnij się że aplikacja została zrestartowana po dodaniu konfiguracji
- Sprawdź ścieżkę do `dist/index.js` w konfiguracji
- Sprawdź czy projekt został zbudowany (`npm run build`)

### Logowanie

Logi błędów są wypisywane do stderr, więc możesz je zobaczyć w:
- Terminal (jeśli uruchamiasz ręcznie)
- Developer Tools aplikacji (Claude Desktop / VS Code)

### Aktualizacja

Po zmianach w kodzie:

```bash
npm run build
```

Następnie zrestartuj aplikację kliencką (Claude Desktop / VS Code).

