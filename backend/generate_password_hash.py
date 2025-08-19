#!/usr/bin/env python3
"""
Utility script to generate password hash for tutor authentication.

Usage:
    uv run generate_password_hash.py

This will prompt for a password and output the hash to use in environment variables.
"""
import getpass
import bcrypt
import logging

logger = logging.getLogger(__name__)

def generate_password_hash() -> str:
    """Generate a bcrypt hash for the given password."""
    password = getpass.getpass("Enter tutor password: ")
    confirm_password = getpass.getpass("Confirm password: ")
    
    if password != confirm_password:
        logger.info("Passwords don't match. Please try again.")
        return generate_password_hash()
    
    if len(password) < 8:
        logger.info("Password must be at least 8 characters long. Please try again.")
        return generate_password_hash()
    
    # Generate salt and hash
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
    
    return password_hash.decode('utf-8')


if __name__ == "__main__":
    hash_value = generate_password_hash()
    logger.info("\n" + "="*50)
    logger.info("Generated password hash:")
    logger.info(hash_value)
    logger.info("\nAdd this to your .env file:")
    logger.info(f"YET_ANOTHER_CALENDAR_TUTOR_PASSWORD_HASH={hash_value}")
    logger.info("="*50)