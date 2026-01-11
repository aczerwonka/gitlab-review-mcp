# Review Workflow - DIFF + Komentarze inline

## Proces

1. `save_review_file` → tworzy `.gitlab_review/mr-{iid}-review.md` (auto .gitignore)
2. Edytuj plik - dodaj `REVIEW_COMMENT:` z `[ACCEPT=true/false]`
3. `publish_review_comments` → wysyła `ACCEPT=true` do GitLab

---

## Format pliku review

```markdown
# Code Review: MR !42

**Projekt:** group/project | **Autor:** Jan Kowalski | **Status:** opened

---

## Ogólne uwagi do MR

REVIEW_COMMENT: Brak testów jednostkowych [ACCEPT=true]
REVIEW_COMMENT: Dokumentacja wymaga aktualizacji [ACCEPT=false]

---

## 📄 src/User.java

\`\`\`diff
@@ -10,7 +10,8 @@
   public class User {
-    private static final String role = "ADMIN";
REVIEW_COMMENT: Nieprawidłowa kolejność modyfikatorów [ACCEPT=true] LINE:15
REVIEW_COMMENT: Pola statyczne WIELKIMI_LITERAMI [ACCEPT=true] LINE:15
+    final private static String role = "ADMIN";
   }
\`\`\`

---
```

---

## Format komentarza

### Ogólny (bez linii)
```
REVIEW_COMMENT: Treść [ACCEPT=true]
```
→ Wysłany jako ogólny komentarz do MR

### Inline (do konkretnej linii)
```
REVIEW_COMMENT: Treść [ACCEPT=true] LINE:42
```
→ Wysłany jako inline comment na linii 42

### Do usuniętej linii
```
REVIEW_COMMENT: Treść [ACCEPT=true] LINE:42 TYPE:old
```
→ Wysłany jako inline comment do starej wersji linii 42

---

## Krok po kroku

### Krok 1: Pobierz diff

**Prompt:**
```
"Pobierz diff z MR 42 projektu group/project do review (workspace: /Users/user/project)"
```

**Wynik:**
- Utworzony katalog `.gitlab_review/`
- Dodany `.gitlab_review` do `.gitignore`
- Utworzony plik `.gitlab_review/mr-42-review.md` z:
  - Informacjami o MR
  - Diffem wszystkich plików
  - Komentarzami pomocniczymi

---

### Krok 2: Dodaj komentarze

**Opcja A - AI analizuje:**
```
"Przeanalizuj plik .gitlab_review/mr-42-review.md i dodaj uwagi"
```

AI dodaje `REVIEW_COMMENT:` z `[ACCEPT=true]` nad problematycznymi liniami.

**Opcja B - Ręcznie:**
Otwierasz plik w IDE i ręcznie dodajesz komentarze w formacie:
```
REVIEW_COMMENT: Problem który widzę [ACCEPT=true] LINE:100
```

**Weryfikacja:**
Przeglądasz komentarze, zmieniasz `[ACCEPT=false]` jeśli nie chcesz wysłać.

---

### Krok 3: Wyślij komentarze

**Prompt:**
```
"Wyślij komentarze z pliku .gitlab_review/mr-42-review.md do MR 42"
```

**Wynik:**
```json
{
  "published": 5,
  "skipped": 2,
  "errors": 0
}
```

- **published**: wysłane (ACCEPT=true)
- **skipped**: pominięte (ACCEPT=false)
- **errors**: błędy podczas wysyłania

---

## Przykłady użycia

### Automatyczne review
```
"Zrób code review MR 42 w projekcie group/project (workspace: /Users/user/project)"
```

AI:
1. Pobiera diff
2. Analizuje kod
3. Dodaje komentarze z `[ACCEPT=true]`
4. Czeka na Twoją weryfikację

Ty:
1. Przeglądasz komentarze
2. Edytujesz/usuwasz niepotrzebne
3. "Wyślij zaakceptowane komentarze"

### Ręczne review
```
"Pobierz diff z MR 42 do review"
```

Ty dodajesz komentarze ręcznie, potem:
```
"Wyślij komentarze z .gitlab_review/mr-42-review.md"
```

### Review z zespołem
1. Pobierasz diff
2. AI dodaje komentarze z `[ACCEPT=false]` (drafty)
3. Pokazujesz plik zespołowi
4. Wspólnie decydujecie co wysłać
5. Zmieniasz na `[ACCEPT=true]` zatwierdzone
6. Wysyłasz

---

## Narzędzia MCP

### save_review_file
- **Input**: workspace_root, project_id, mr_iid
- **Output**: review_file_path, success, message

### publish_review_comments  
- **Input**: review_file_path, project_id, mr_iid
- **Output**: published, skipped, errors, success, message

---

## Zalety

✅ Jeden plik - diff + komentarze razem
✅ Auto .gitignore - nie zaśmieca repo
✅ Kontrola - wybierasz co wysłać
✅ Prosty format - jedna linia = jeden komentarz
✅ Inline - komentarze nad problematycznymi liniami
✅ Markdown - syntax highlighting w IDE
✅ Batch - wszystkie komentarze naraz
✅ Offline - możesz pracować bez połączenia
✅ Historia - możesz commitować do review brancha
✅ Współpraca - łatwo udostępnić zespołowi

---

Szczegóły formatu: `FORMAT_SPEC.md`

