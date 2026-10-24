import os
import boto3
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# Load server/.env reliably regardless of current working directory
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(env_path)

print("=" * 60)
print("  365 MEMORY BANK — DATABASE & S3 HEALTH CHECK")
print("=" * 60)

# --- 1. TEST POSTGRESQL ---
print("\n[1/2] Testing PostgreSQL Database...")
db_url = os.getenv("DATABASE_URL", "")
print(f"Connecting to: {db_url}")

try:
    from sqlalchemy import create_engine, text
    # Ensure psycopg2 driver is used if postgresql:// is provided
    engine_url = db_url
    if engine_url.startswith("postgresql://"):
        engine_url = engine_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    
    engine = create_engine(engine_url)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT current_database(), current_user, version();"))
        db, user, ver = res.fetchone()
        print(f"  ✅ SUCCESS: Connected to PostgreSQL!")
        print(f"     Database : {db}")
        print(f"     User     : {user}")
        
        tables_res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';"))
        tables = [r[0] for r in tables_res.fetchall()]
        print(f"     Tables   : {tables}")
except Exception as e:
    print(f"  ❌ FAILED: {type(e).__name__}: {e}")

# --- 2. TEST AWS S3 ---
print("\n[2/2] Testing AWS S3 Storage...")
access_key = os.getenv("S3_ACCESS_KEY")
secret_key = os.getenv("S3_SECRET_KEY")
bucket_name = os.getenv("S3_BUCKET_NAME")
region = os.getenv("S3_REGION_NAME", "ap-southeast-2")

print(f"  Access Key : {access_key[:4]}...{access_key[-4:] if access_key else ''}")
print(f"  Bucket     : {bucket_name}")
print(f"  Region     : {region}")

# 2a. Check STS Identity
try:
    sts = boto3.client("sts", aws_access_key_id=access_key, aws_secret_access_key=secret_key, region_name=region)
    ident = sts.get_caller_identity()
    print(f"  ✅ IAM Identity Verified:")
    print(f"     ARN     : {ident.get('Arn')}")
    print(f"     Account : {ident.get('Account')}")
except Exception as e:
    print(f"  ❌ Invalid AWS Credentials: {e}")
    ident = None

# 2b. Check PutObject on S3 Bucket
if ident:
    try:
        s3 = boto3.client("s3", aws_access_key_id=access_key, aws_secret_access_key=secret_key, region_name=region)
        test_key = "test_verification.txt"
        s3.put_object(
            Bucket=bucket_name,
            Key=test_key,
            Body=b"365 Memory Bank dummy test request successful!"
        )
        print(f"  ✅ SUCCESS: PutObject to s3://{bucket_name}/{test_key} succeeded!")
        
        # Clean up
        s3.delete_object(Bucket=bucket_name, Key=test_key)
        print(f"  ✅ SUCCESS: DeleteObject cleanup succeeded!")
    except Exception as e:
        print(f"  ❌ S3 Storage Operation Failed: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
