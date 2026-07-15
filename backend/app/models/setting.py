from sqlalchemy import Column, String, Text
from app.database.base_class import Base

class Setting(Base):
    __tablename__ = "settings"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False)
