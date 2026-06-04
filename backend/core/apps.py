from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = 'core'

    def ready(self):
        # import and activate the billing signals when the server starts up
        import core.signals