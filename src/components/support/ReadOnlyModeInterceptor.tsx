import { useEffect, useCallback } from "react";
import { useImpersonation } from "@/hooks/useImpersonation";

/**
 * Interceptor component that blocks all form submissions and mutations
 * when in read-only support mode.
 */
export function ReadOnlyModeInterceptor() {
  const { isImpersonating, blockWriteAction } = useImpersonation();

  const handleFormSubmit = useCallback((e: Event) => {
    if (!isImpersonating) return;
    
    const form = e.target as HTMLFormElement;
    const action = form.action || form.getAttribute('data-action') || 'form_submit';
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    blockWriteAction(action);
  }, [isImpersonating, blockWriteAction]);

  const handleButtonClick = useCallback((e: Event) => {
    if (!isImpersonating) return;
    
    const button = e.target as HTMLButtonElement;
    const type = button.type || 'button';
    
    // Allow navigation and read-only actions
    const safeActions = ['button', 'reset'];
    const safeClassNames = ['nav', 'menu', 'toggle', 'accordion', 'tab', 'collapse'];
    const buttonClasses = button.className.toLowerCase();
    const isSafe = safeClassNames.some(cls => buttonClasses.includes(cls));
    
    // Check if it's a submit button or has data-action
    const isSubmit = type === 'submit';
    const hasAction = button.hasAttribute('data-action') || 
                      button.getAttribute('aria-label')?.toLowerCase().includes('save') ||
                      button.getAttribute('aria-label')?.toLowerCase().includes('delete') ||
                      button.getAttribute('aria-label')?.toLowerCase().includes('create') ||
                      button.getAttribute('aria-label')?.toLowerCase().includes('update');
    
    const buttonText = button.textContent?.toLowerCase() || '';
    const isWriteAction = ['salvar', 'criar', 'editar', 'excluir', 'deletar', 'atualizar', 
                           'save', 'create', 'edit', 'delete', 'update', 'remove', 'add'].some(
      word => buttonText.includes(word)
    );
    
    if ((isSubmit || hasAction || isWriteAction) && !isSafe) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      const actionName = button.getAttribute('data-action') || 
                         button.getAttribute('aria-label') || 
                         buttonText || 
                         'button_click';
      blockWriteAction(actionName);
    }
  }, [isImpersonating, blockWriteAction]);

  useEffect(() => {
    if (!isImpersonating) return;

    // Capture all form submissions
    document.addEventListener('submit', handleFormSubmit, true);
    
    // Capture button clicks that might trigger mutations
    document.addEventListener('click', handleButtonClick, true);

    return () => {
      document.removeEventListener('submit', handleFormSubmit, true);
      document.removeEventListener('click', handleButtonClick, true);
    };
  }, [isImpersonating, handleFormSubmit, handleButtonClick]);

  // This component doesn't render anything
  return null;
}
