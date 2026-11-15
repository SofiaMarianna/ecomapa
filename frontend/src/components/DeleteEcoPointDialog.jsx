import { useEffect, useRef } from 'react';

export default function DeleteEcoPointDialog({
  point,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const isDeletingRef = useRef(isDeleting);
  const onCancelRef = useRef(onCancel);
  isDeletingRef.current = isDeleting;
  onCancelRef.current = onCancel;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const focusFallback = previouslyFocused?.closest('.details-panel');
    const previousBodyOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isDeletingRef.current) {
        event.preventDefault();
        onCancelRef.current();
        return;
      }

      if (event.key !== 'Tab' || !dialog) {
        return;
      }

      const focusableElements = Array.from(dialog.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => (
        element.getClientRects().length > 0
        && window.getComputedStyle(element).visibility === 'visible'
      ));
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    cancelButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      } else if (focusFallback?.isConnected) {
        focusFallback.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (isDeleting) {
      dialogRef.current?.focus();
    } else if (error) {
      dialogRef.current?.querySelector('.destructive-button')?.focus();
    }
  }, [error, isDeleting]);

  return (
    <div
      className="create-modal-backdrop delete-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeletingRef.current) {
          onCancelRef.current();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="create-modal delete-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-point-title"
        aria-describedby="delete-point-description"
        aria-busy={isDeleting}
        tabIndex="-1"
      >
        <div className="create-modal-heading">
          <div>
            <p className="eyebrow">Remover local de coleta</p>
            <h2 id="delete-point-title">Excluir ponto?</h2>
          </div>
        </div>

        <div className="delete-modal-content">
          <p id="delete-point-description">
            Tem certeza de que deseja excluir <strong>{point.name}</strong>?
            Esta ação é permanente.
          </p>
          {point.is_demo && (
            <p className="delete-demo-warning">
              Este é um registro de demonstração.
            </p>
          )}
          {error && (
            <p className="delete-dialog-error" role="alert">{error}</p>
          )}
          {isDeleting && (
            <p className="state-message" role="status">
              <span className="loading-dot" aria-hidden="true" />
              Excluindo ponto…
            </p>
          )}
        </div>

        <div className="delete-dialog-actions">
          <button
            ref={cancelButtonRef}
            className="secondary-button"
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancelar
          </button>
          <button
            className="destructive-button"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Excluindo…' : 'Excluir ponto'}
          </button>
        </div>
      </section>
    </div>
  );
}
