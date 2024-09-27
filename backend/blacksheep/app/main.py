"""
This module configures the BlackSheep application before it starts.
"""

from app.auth import configure_authentication
from app.docs import configure_docs
from app.errors import configure_error_handlers
from app.services import configure_services
from app.settings import Settings, load_settings
from blacksheep import Application
from rodi import Container

import yet_another_calendar.web.api.netology.schema


async def extract_netology_cookies(request):
    headers_dict = {
        "_netology-on-rails_session": request.cookies.get(b'_netology-on-rails_session').decode(),
        "sg_payment_exist": request.cookies.get(b'sg_payment_exist').decode(),
        "sg_reg_date": request.cookies.get(b'sg_reg_date').decode(),
        "sg_uid": request.cookies.get(b'sg_uid').decode(),
        "remember_user_token": request.cookies.get(b'remember_user_token').decode(),
        "http_x_authentication": request.cookies.get(b'http_x_authentication').decode(),
    }
    from app.controllers.models import NetologyCookies
    return NetologyCookies(**headers_dict)


async def middleware_one(request, handler):
    print("middleware one: A")
    yet_another_calendar.web.api.netology.schema.get_cookies_from_headers = await extract_netology_cookies(request)
    response = await handler(request)
    print("middleware one: B")
    return response


def configure_application(
        services: Container,
        settings: Settings,
) -> Application:
    app = Application(
        services=services,
        show_error_details=settings.app.show_error_details,
    )

    app.serve_files("app/static", root_path='/static/')
    configure_error_handlers(app)
    configure_authentication(app, settings)
    configure_docs(app, settings)
    app.middlewares.append(middleware_one)

    app.use_cors(
        allow_methods="*",
        allow_origins="*",
        allow_headers="*",
        max_age=300,
    )

    return app


app = configure_application(*configure_services(load_settings()))
