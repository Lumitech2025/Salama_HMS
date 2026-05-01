from django.shortcuts import render
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class SalamaTokenSerializer(TokenObtainPairSerializer):
    """
    Custom Serializer to handle the employee_id and password mapping.
    """
    def validate(self, attrs):
        # Retrieve the raw data sent from React
        data = self.context['request'].data
        
        # FIX: We use 'employee_id' and 'password' to match your Login.jsx
        # Use .get() to prevent KeyErrors if the frontend sends a blank request
        username = data.get('employee_id')
        password = data.get('password')

        if not username or not password:
            raise Exception("Employee ID and Password are required.")

        # Mapping these to the internal Django 'username' and 'password' fields
        attrs['username'] = username
        attrs['password'] = password
        
        return super().validate(attrs)

class SalamaAuthView(TokenObtainPairView):
    serializer_class = SalamaTokenSerializer

    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            user = serializer.user
            # Fetch designation, defaulting to 'STAFF' if not set
            designation = getattr(user, 'designation', 'STAFF')
            
            # Clinical Override: Ensure Superusers have Admin access
            if user.is_superuser and (not designation or designation == 'STAFF'):
                designation = 'ADMIN'

            # SUCCESS: This is the payload your React code will receive
            return Response({
                'access': str(serializer.validated_data['access']),
                'refresh': str(serializer.validated_data['refresh']),
                'designation': designation,
                'name': user.get_full_name() or user.username
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Check your terminal for this print statement!
            print(f"Login Crash Trace: {str(e)}")
            return Response(
                {"detail": "Authentication failed. Check credentials."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )