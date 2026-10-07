# models.py
# SQLAlchemy ORM models for the network database

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Network(Base):
    """A named network containing nodes and edges."""
    __tablename__ = "networks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    nodes = relationship("Node", back_populates="network", cascade="all, delete-orphan", lazy="selectin")
    edges = relationship("Edge", back_populates="network", cascade="all, delete-orphan", lazy="selectin")


class Node(Base):
    """A location / vertex in the network."""
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, index=True)
    network_id = Column(Integer, ForeignKey("networks.id"), nullable=False)
    label = Column(String, nullable=False)

    network = relationship("Network", back_populates="nodes")


class Edge(Base):
    """A weighted undirected connection between two nodes.

    status values:
      'active'   - normal edge available for use
      'mst'      - selected by Kruskal as part of MST
      'rejected' - examined by Kruskal but rejected (cycle)
      'failed'   - simulated network failure
      'recovery' - added during fault recovery
    """
    __tablename__ = "edges"

    id = Column(Integer, primary_key=True, index=True)
    network_id = Column(Integer, ForeignKey("networks.id"), nullable=False)
    source = Column(String, nullable=False)
    destination = Column(String, nullable=False)
    cost = Column(Float, nullable=False)
    # status tracks edge role in current algorithm state
    status = Column(String, default="active")

    network = relationship("Network", back_populates="edges")
