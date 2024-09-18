import requests

import undetected_chromedriver as uc
from selenium.webdriver.remote.webdriver import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from django.conf import settings


def auth() -> dict:
    with uc.Chrome(headless=True, use_subprocess=False) as driver:
        driver.get('https://utmn.modeus.org/')
        input_username = WebDriverWait(driver, 60).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input#userNameInput"))
        )
        input_password = driver.find_element(By.CSS_SELECTOR, 'input#passwordInput')
        input_username.send_keys(settings.USERNAME_MODEUS)
        input_password.send_keys(settings.PASSWORD_MODEUS)
        input_password.send_keys("\n")
        try:
            # wait until we loaded into site
            WebDriverWait(driver, 60).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.fc-toolbar"))
            )
            storage = driver.execute_script("return sessionStorage;")
            return storage['id_token']
        except KeyError:
            print('Can\'t auth!')
            raise


def get_calendar(session: requests.Session, person_id='b87918b9-6a18-4682-8a63-132ce85517a4'):
    json_data = {
        'size': 500,
        'timeMin': '2024-09-15T19:00:00Z',  # todo add arg
        'timeMax': '2024-09-22T19:00:00Z',  # todo add arg
        'attendeePersonId': [
            person_id,
        ],
    }

    response = session.post(
        'https://utmn.modeus.org/schedule-calendar-v2/api/calendar/events/search',
        json=json_data,
    )
    response.raise_for_status()
    return response.json()


def main():
    id_token = auth()
    session = requests.session()
    session.headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:130.0) Gecko/20100101 Firefox/130.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ru-RU",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Authorization": f"Bearer {id_token}",
        "Origin": "https://utmn.modeus.org",
        "DNT": "1",
        "Sec-GPC": "1",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "TE": "trailers",
        "Content-Type": "application/json",
    }
    get_calendar(session)


if __name__ == '__main__':
    main()
