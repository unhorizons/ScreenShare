from sqlalchemy import create_engine, MetaData, Boolean, Table, Column, Integer, String, ForeignKey
from databases import Database

DATABASE_URL = "sqlite:///./data.db"  # SQLite file-based database

database = Database(DATABASE_URL)
metadata = MetaData()
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("username", String(50)),
    Column("session_id", Integer, ForeignKey("sessions.id", ondelete="CASCADE"))
)

sessions = Table(
    "sessions",
    metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("active", Boolean, default=False),
    Column("workshop", String(100)),
    Column("lead", String(100))
)

metadata.create_all(engine)  # Create the table in the database
