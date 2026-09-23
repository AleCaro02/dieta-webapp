# La mia dieta — web app

Web app statica pensata per GitHub Pages. Non richiede un PC acceso, un server o un database.

## 1. Il file Excel

Metti nella stessa cartella di `index.html` un file chiamato:

`dieta.xlsx`

L'app legge il **primo foglio** dell'Excel.

Le colonne obbligatorie sono:

- `Giorno`
- `Pasto`
- `Gruppo`
- `Alimento`
- `Quantità`
- `Unità`
- `Note` (facoltativa)

### Regola fondamentale per le alternative

Le righe con lo stesso `Giorno + Pasto + Gruppo` sono alternative.

Esempio:

| Giorno | Pasto | Gruppo | Alimento | Quantità | Unità |
|---|---|---:|---|---:|---|
| Lunedì | Pranzo | 2 | Pollo | 200 | g |
| Lunedì | Pranzo | 2 | Tritato di petto di pollo | 200 | g |

Nell'app apparirà "Scegli una": Pollo oppure Tritato di petto di pollo.

Se invece due righe hanno gruppi diversi, entrambe fanno parte del pasto.

## 2. Pubblicazione su GitHub Pages

1. Crea un repository GitHub.
2. Carica `index.html`, `style.css`, `app.js` e `dieta.xlsx`.
3. Vai in Settings → Pages.
4. Seleziona il branch principale e la cartella `/ (root)`.
5. Salva.
6. Apri l'indirizzo GitHub Pages generato.

## 3. Uso da iPhone

Apri il sito in Safari → Condividi → "Aggiungi alla schermata Home".

Le scelte effettuate e le spunte della lista della spesa vengono salvate localmente nel browser del dispositivo.

## 4. Se vuoi cambiare la dieta

Basta sostituire `dieta.xlsx` nel repository con il nuovo file mantenendo le stesse colonne. Non serve modificare il codice.

## Nota

La web app visualizza i dati inseriti nell'Excel e non modifica autonomamente quantità o alternative della dieta.
