"""Downloads the original FIT of a race from Garmin Connect, ready for build-race.

  login          asks email, password and the MFA code once, then keeps the tokens
  fetch <race>   downloads the activity of the race date into its folder

Uses the unofficial python-garminconnect: Garmin offers no personal API.
Tokens stay in ~/.garminconnect, outside the repo and outside the backup.
"""

import getpass
import io
import re
import sys
import zipfile
from pathlib import Path

from garminconnect import (
    Garmin,
    GarminConnectAuthenticationError,
    GarminConnectConnectionError,
    GarminConnectTooManyRequestsError,
)

TOKENS = str(Path.home() / ".garminconnect")
RACES = Path("src/content/races")


def fail(message: str) -> None:
    print(f"\nErrore: {message}", file=sys.stderr)
    sys.exit(1)


def login() -> None:
    email = input("Email Garmin: ").strip()
    password = getpass.getpass("Password Garmin (non viene mostrata): ")
    client = Garmin(email, password, prompt_mfa=lambda: input("Codice di verifica: ").strip())
    client.login(TOKENS)
    print(f"\nAccesso riuscito: token salvati in {TOKENS}.")


def race_date(slug: str) -> str:
    index = RACES / slug / "index.md"
    if not index.exists():
        fail(f"gara non trovata: {index}")
    match = re.search(r"^date:\s*'?(\d{4}-\d{2}-\d{2})", index.read_text(encoding="utf-8"), re.M)
    if not match:
        fail(f"{index} non ha una data AAAA-MM-GG")
    return match.group(1)


def fetch(slug: str) -> None:
    date = race_date(slug)
    client = Garmin()
    try:
        client.login(TOKENS)
    except GarminConnectAuthenticationError:
        fail("nessun accesso salvato o scaduto: lancia prima npm run garmin -- login")
    activities = client.get_activities_by_date(date, date)
    if not activities:
        fail(f"nessuna attività su Garmin Connect il {date}")
    # On a race day the race is the longest activity.
    activity = max(activities, key=lambda item: item.get("distance") or 0)
    if len(activities) > 1:
        print(f"{len(activities)} attività il {date}: scelgo la più lunga.")
    km = (activity.get("distance") or 0) / 1000
    print(f"Scarico \"{activity.get('activityName')}\" del {activity.get('startTimeLocal')}, {km:.2f} km.")
    archive = client.download_activity(
        str(activity["activityId"]), dl_fmt=Garmin.ActivityDownloadFormat.ORIGINAL
    )
    folder = RACES / slug
    with zipfile.ZipFile(io.BytesIO(archive)) as files:
        fits = [name for name in files.namelist() if name.lower().endswith(".fit")]
        if not fits:
            fail("l'archivio di Garmin non contiene un file FIT")
        for name in fits:
            (folder / Path(name).name).write_bytes(files.read(name))
            print(f"Salvato {folder / Path(name).name}")
    print(f"\nOra lancia npm run build-race {slug}")


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        if command == "login":
            login()
        elif command == "fetch" and len(sys.argv) > 2:
            fetch(Path(sys.argv[2].rstrip("/\\")).name)
        else:
            fail("usa npm run garmin -- login, oppure npm run garmin -- fetch <gara>")
    except GarminConnectTooManyRequestsError:
        fail("troppi tentativi: Garmin ha bloccato per qualche minuto, riprova più tardi")
    except GarminConnectAuthenticationError as error:
        fail(f"accesso rifiutato da Garmin: {error}")
    except GarminConnectConnectionError as error:
        fail(f"Garmin non risponde: {error}")


if __name__ == "__main__":
    main()
