from django.urls import path
from .views import SalamaAuthView
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('login/', SalamaAuthView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]