from pathlib import Path
import environ

from datetime import timedelta

import os
from dotenv import load_dotenv  

BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment variables handler
env = environ.Env(
    # set casting defaults if variables are missing
    DEBUG=(bool, False)
)

# Read the literal .env file context matching your layout path
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))




# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!

SECRET_KEY = env('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env('DEBUG')

ALLOWED_HOSTS = [
    '192.168.100.108', 
    'localhost', 
    '127.0.0.1', 
    'detra-unjapanned-ashton.ngrok-free.dev',  
    'detra-unjapanned-ashton.ngrok-free.app',  
    '.ngrok-free.dev', 
    '.ngrok-free.app'
]


# Application definition

INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'authentication',
    'rest_framework_simplejwt',
    'core',
    'django_filters',
    'django_extensions',
]

AUTH_USER_MODEL = 'authentication.User'

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env('DB_PORT'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'Africa/Nairobi'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = 'static/'

CORS_ALLOWED_ORIGINS = [

]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_HEADERS = [
    "accept",
    "authorization", 
    "content-type",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

CORS_ALLOW_CREDENTIALS = True



REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        # This allows you to bypass the 401 errors during development
        'rest_framework.permissions.AllowAny', 
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),     
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),    
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,                      
    'AUTH_HEADER_TYPES': ('Bearer',),                
}



# ==========================================
# SALAMA HMS NOTIFICATION GATEWAY CONFIG
# ==========================================

env_path = BASE_DIR / '.env'

# --- Core Email Architecture Config (SMTP Configuration) ---
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True

# Pulling values cleanly from your .env file
EMAIL_HOST_USER = 'collinsmwiti98@gmail.com'
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')

# The formal outbound header mask for patient communications
DEFAULT_FROM_EMAIL = f"Salama Cancer Care <{EMAIL_HOST_USER}>"

# --- SMS Infrastructure Configuration (HttpSMS Gateway) ---
# Pulled safely from your local .env to keep your public GitHub repo secure
HTTPSMS_API_KEY = env('HTTPSMS_API_KEY', default='')

# WHO ICD-11 Configuration
ICD11_CLIENT_ID = env('ICD11_CLIENT_ID', default='')
ICD11_CLIENT_SECRET = env('ICD11_CLIENT_SECRET', default='')


JAZZMIN_SETTINGS = {
    "site_title": "Salama HMS",
    "site_header": "Salama",
    "site_brand": "Salama Hospital",
    "site_logo": None, # You can add a medical cross icon here later
    "welcome_sign": "Salama HMS Portal",
    "copyright": "Salama HMS Ltd",
    "search_model": ["core.Patient"], # Vital: Search patients directly from the top bar
    
    "topmenu_links": [
        {"name": "Home",  "url": "admin:index", "permissions": ["auth.view_user"]},
        {"name": "Support", "url": "https://salama-hms.com/support", "new_window": True},
    ],

    "show_sidebar": True,
    "navigation_expanded": True,

    # Custom Icons for the sidebar (Font Awesome)
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.user": "fas fa-user-md",
        "core.Patient": "fas fa-hospital-user",
        "core.Treatment": "fas fa-hand-holding-medical",
        "core.ChemoSession": "fas fa-Syringe",
        "core.Drug": "fas fa-pills",
        "core.LabResult": "fas fa-microscope",
        "core.Bill": "fas fa-file-invoice-dollar",
        "core.Protocol": "fas fa-clipboard-list",
    },
    
    # Organize the Sidebar into logical groups
    "order_with_respect_to": [
        "core.Patient", 
        "core.Treatment", 
        "core.ChemoSession", 
        "core.LabResult", 
        "core.Drug", 
        "core.Bill",
        "auth"
    ],
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": True,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-dark",
    "accent": "accent-primary",
    "navbar": "navbar-dark",
    "no_navbar_border": False,
    "navbar_fixed": True,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "flatly", # This gives that clean, blue/white hospital feel
    "dark_mode_theme": None,
    "button_classes": {
        "primary": "btn-primary",
        "secondary": "btn-secondary",
        "info": "btn-info",
        "warning": "btn-warning",
        "danger": "btn-danger",
        "success": "btn-success"
    }
}

APPEND_SLASH = True

MPESA_CONSUMER_KEY = env("MPESA_CONSUMER_KEY", default="")
MPESA_CONSUMER_SECRET = env("MPESA_CONSUMER_SECRET", default="")
MPESA_SHORTCODE = env("MPESA_SHORTCODE", default="174379")
MPESA_PASSKEY = env("MPESA_PASSKEY", default="")

MPESA_ENVIRONMENT = "sandbox" 
MPESA_CALLBACK_URL = env("MPESA_CALLBACK_URL", default="")
