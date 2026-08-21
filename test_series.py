"""
Alias re-export module to prevent duplicate SQLAlchemy Mapper errors.
All ORM class definitions reside in shared.models.test.
"""
from shared.models.test import TestSeries, Test, Question, TestAttempt

__all__ = ['TestSeries', 'Test', 'Question', 'TestAttempt']