/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useState, useRef } from 'react';
import { UserWarning } from './UserWarning';
import { Todo } from './types/Todo';
import {
  getTodos,
  createTodo,
  deleteTodo,
  updateTodo,
  USER_ID,
} from './api/todos';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [loadingTodoIds, setLoadingTodoIds] = useState<number[]>([]);
  
  const [editingTodoId, setEditingTodoId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const newTodoFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setErrorMessage('');
    getTodos()
      .then(setTodos)
      .catch(() => setErrorMessage('Unable to load todos'));
  }, []);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => setErrorMessage(''), 3000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTodoTitle.trim();

    if (!trimmedTitle) {
      setErrorMessage('Title should not be empty');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    setTempTodo({
      id: 0,
      userId: USER_ID,
      title: trimmedTitle,
      completed: false,
    });

    createTodo({ title: trimmedTitle, userId: USER_ID, completed: false })
      .then(newTodo => {
        setTodos(prev => [...prev, newTodo]);
        setNewTodoTitle('');
      })
      .catch(() => setErrorMessage('Unable to add a todo'))
      .finally(() => {
        setTempTodo(null);
        setIsSubmitting(false);
        setTimeout(() => {
          if (newTodoFieldRef.current) {
            newTodoFieldRef.current.focus();
          }
        }, 0);
      });
  };

  const handleDelete = (todoId: number) => {
    setErrorMessage('');
    setLoadingTodoIds(prev => [...prev, todoId]);

    return deleteTodo(todoId)
      .then(() => {
        setTodos(prev => prev.filter(t => t.id !== todoId));
      })
      .catch(() => {
        setErrorMessage('Unable to delete a todo');
        throw new Error();
      })
      .finally(() => {
        setLoadingTodoIds(prev => prev.filter(id => id !== todoId));
        setTimeout(() => {
          if (newTodoFieldRef.current) {
            newTodoFieldRef.current.focus();
          }
        }, 0);
      });
  };

  const handleClearCompleted = () => {
    const completedTodos = todos.filter(t => t.completed);
    completedTodos.forEach(todo => {
      handleDelete(todo.id);
    });
  };

  const handleUpdate = (todoId: number, data: Partial<Todo>) => {
    setErrorMessage('');
    setLoadingTodoIds(prev => [...prev, todoId]);

    return updateTodo(todoId, data)
      .then(updated => {
        setTodos(prev => prev.map(t => (t.id === todoId ? updated : t)));
      })
      .catch(() => {
        setErrorMessage('Unable to update a todo');
        throw new Error();
      })
      .finally(() => {
        setLoadingTodoIds(prev => prev.filter(id => id !== todoId));
      });
  };

  const renameTodo = (todoId: number, newTitle: string) => {
    const trimmed = newTitle.trim();
    const currentTodo = todos.find(t => t.id === todoId);
    
    if (!currentTodo || trimmed === currentTodo.title) {
      setEditingTodoId(null);
      return;
    }
    
    if (!trimmed) {
      handleDelete(todoId)
        .then(() => setEditingTodoId(null))
        .catch(() => {});
      return;
    }
    
    handleUpdate(todoId, { title: trimmed })
      .then(() => setEditingTodoId(null))
      .catch(() => {});
  };

  const handleToggleAll = () => {
    const activeCount = todos.filter(t => !t.completed).length;
    const targetStatus = activeCount > 0;
    const todosToUpdate = todos.filter(t => t.completed !== targetStatus);

    todosToUpdate.forEach(todo => {
      handleUpdate(todo.id, { completed: targetStatus });
    });
  };

  const visibleTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const activeTodosCount = todos.filter(t => !t.completed).length;
  const hasCompletedTodos = todos.some(t => t.completed);
  const isAllCompleted = todos.length > 0 && activeTodosCount === 0;

  const toggleAllClass = `todoapp__toggle-all ${
    isAllCompleted ? 'active' : ''
  }`;
  
  const getFilterClass = (curr: string) => {
    return `filter__link ${filter === curr ? 'selected' : ''}`;
  };
  
  const notificationClass = [
    'notification',
    'is-danger',
    'is-light',
    'has-text-weight-normal',
    !errorMessage ? 'hidden' : '',
  ].join(' ');

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {todos.length > 0 && (
            <button
              type="button"
              className={toggleAllClass}
              data-cy="ToggleAllButton"
              onClick={handleToggleAll}
            />
          )}

          <form onSubmit={handleAddTodo}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              disabled={isSubmitting}
              ref={newTodoFieldRef}
              autoFocus
            />
          </form>
        </header>

        {(todos.length > 0 || tempTodo) && (
          <>
            <section className="todoapp__main" data-cy="TodoList">
              {visibleTodos.map(todo => (
                <div
                  key={todo.id}
                  data-cy="Todo"
                  className={`todo ${todo.completed ? 'completed' : ''}`}
                >
                  <label className="todo__status-label">
                    <input
                      data-cy="TodoStatus"
                      type="checkbox"
                      className="todo__status"
                      checked={todo.completed}
                      onChange={() => {
                        handleUpdate(todo.id, { completed: !todo.completed });
                      }}
                    />
                  </label>

                  {editingTodoId === todo.id ? (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        renameTodo(todo.id, editTitle);
                      }}
                    >
                      <input
                        data-cy="TodoTitleField"
                        type="text"
                        className="todo__title-field"
                        placeholder="Empty todo will be deleted"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => renameTodo(todo.id, editTitle)}
                        onKeyUp={e => {
                          if (e.key === 'Escape') {
                            setEditingTodoId(null);
                          }
                        }}
                        ref={el => {
                          if (el && document.activeElement !== el) {
                            el.focus();
                          }
                        }}
                      />
                    </form>
                  ) : (
                    <>
                      <span
                        data-cy="TodoTitle"
                        className="todo__title"
                        onDoubleClick={() => {
                          setEditingTodoId(todo.id);
                          setEditTitle(todo.title);
                        }}
                      >
                        {todo.title}
                      </span>

                      <button
                        type="button"
                        className="todo__remove"
                        data-cy="TodoDelete"
                        onClick={() => handleDelete(todo.id)}
                      >
                        ×
                      </button>
                    </>
                  )}

                  <div
                    data-cy="TodoLoader"
                    className={`modal overlay ${
                      loadingTodoIds.includes(todo.id) ? 'is-active' : ''
                    }`}
                  >
                    {/* eslint-disable-next-line max-len */}
                    <div className="modal-background has-background-white-ter" />
                    <div className="loader" />
                  </div>
                </div>
              ))}

              {tempTodo && (
                <div data-cy="Todo" className="todo">
                  <label className="todo__status-label">
                    <input
                      data-cy="TodoStatus"
                      type="checkbox"
                      className="todo__status"
                      checked={tempTodo.completed}
                      readOnly
                    />
                  </label>

                  <span data-cy="TodoTitle" className="todo__title">
                    {tempTodo.title}
                  </span>

                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                  >
                    ×
                  </button>

                  <div
                    data-cy="TodoLoader"
                    className="modal overlay is-active"
                  >
                    {/* eslint-disable-next-line max-len */}
                    <div className="modal-background has-background-white-ter" />
                    <div className="loader" />
                  </div>
                </div>
              )}
            </section>

            <footer className="todoapp__footer" data-cy="Footer">
              <span className="todo-count" data-cy="TodosCounter">
                {activeTodosCount} items left
              </span>

              <nav className="filter" data-cy="Filter">
                <a
                  href="#/"
                  className={getFilterClass('all')}
                  data-cy="FilterLinkAll"
                  onClick={() => setFilter('all')}
                >
                  All
                </a>

                <a
                  href="#/active"
                  className={getFilterClass('active')}
                  data-cy="FilterLinkActive"
                  onClick={() => setFilter('active')}
                >
                  Active
                </a>

                <a
                  href="#/completed"
                  className={getFilterClass('completed')}
                  data-cy="FilterLinkCompleted"
                  onClick={() => setFilter('completed')}
                >
                  Completed
                </a>
              </nav>

              <button
                type="button"
                className="todoapp__clear-completed"
                data-cy="ClearCompletedButton"
                disabled={!hasCompletedTodos}
                onClick={handleClearCompleted}
              >
                Clear completed
              </button>
            </footer>
          </>
        )}
      </div>

      <div data-cy="ErrorNotification" className={notificationClass}>
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setErrorMessage('')}
        />
        {errorMessage}
      </div>
    </div>
  );
};