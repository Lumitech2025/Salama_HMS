from django.shortcuts import render
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from .models import User
from .serializers import UserRegistrySerializer

class SalamaTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = self.context['request'].data
        username = data.get('employee_id')
        password = data.get('password')

        if not username or not password:
            raise ValidationError("Employee ID and Password are required parameters.")

        # Bind token payload verification explicitly to employee_id
        attrs[User.USERNAME_FIELD] = username
        attrs['password'] = password
        
        return super().validate(attrs)

class SalamaAuthView(TokenObtainPairView):
    serializer_class = SalamaTokenSerializer

    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user = serializer.user
            designation = getattr(user, 'designation', 'STAFF')
            
            if user.is_superuser and (not designation or designation == 'STAFF'):
                designation = 'ADMIN'

            return Response({
                'access': str(serializer.validated_data['access']),
                'refresh': str(serializer.validated_data['refresh']),
                'designation': designation,
                'name': user.get_full_name() or user.username
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"Login Crash Trace: {str(e)}")
            return Response(
                {"detail": "Authentication failed. Check credentials."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
class UserRegistryViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('employee_id')
    serializer_class = UserRegistrySerializer
    permission_classes = [IsAuthenticated]