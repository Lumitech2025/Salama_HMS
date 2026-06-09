from rest_framework import serializers
from .models import User

class UserRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'employee_id', 'username', 'first_name', 'last_name', 
            'email', 'phone_number', 'role', 'is_staff', 
            'is_active', 'is_password_change_required', 'password'
        ]
        # Ensure password is write-only so it never leaks back to the client
        extra_kwargs = {'password': {'write_only': True, 'required': False}}

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)  # Hashes password automatically
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        return super().update(instance, validated_data)