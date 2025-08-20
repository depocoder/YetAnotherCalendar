#!/usr/bin/env python3
"""
Utility script to generate password hash for tutor authentication.

Usage:
    uv run generate_password_hash.py [password]

This will prompt for a password or use the provided one and output the hash to use in environment variables.
"""
import sys
import getpass
import bcrypt
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def generate_password_hash(password: str | None = None) -> str:
    """Generate a bcrypt hash for the given password."""
    if password is None:
        password = getpass.getpass("Enter tutor password: ")
        confirm_password = getpass.getpass("Confirm password: ")
        
        if password != confirm_password:
            logger.info("Passwords don't match. Please try again.")
            return generate_password_hash()
    
    if len(password) < 8:
        logger.info("Password must be at least 8 characters long. Please try again.")
        if password is None:
            return generate_password_hash()
        else:
            sys.exit(1)
    
    # Generate salt and hash
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
    
    return password_hash.decode('utf-8')


if __name__ == "__main__":
    password_arg = sys.argv[1] if len(sys.argv) > 1 else None
    hash_value = generate_password_hash(password_arg)
    
    # Verify the hash works
    if password_arg:
        verification_result = bcrypt.checkpw(password_arg.encode('utf-8'), hash_value.encode('utf-8'))
        logger.info(f"Hash verification: {verification_result}")
    
    logger.info("\n" + "="*50)
    logger.info("Generated password hash:")
    logger.info(hash_value)
    logger.info(f"Hash length: {len(hash_value)}")
    logger.info("\nAdd this to your .env file:")
    logger.info(f"YET_ANOTHER_CALENDAR_TUTOR_PASSWORD_HASH={hash_value}")
    logger.info("\nFor Docker Compose (escape $ characters):")
    docker_hash = hash_value.replace("$", "$$")
    logger.info(f"YET_ANOTHER_CALENDAR_TUTOR_PASSWORD_HASH={docker_hash}")
    logger.info("="*50)