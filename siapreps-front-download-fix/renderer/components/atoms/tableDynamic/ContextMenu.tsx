import React, { useState, useRef, useEffect } from 'react';


export interface ContextMenuAction {

  label: string;
  

  onClick: () => void;
  

  icon?: React.ReactNode;
  

  disabled?: boolean;
  

  divider?: boolean;
}

export interface ContextMenuProps {

  actions: ContextMenuAction[];
  

  className?: string;
}


export const ContextMenu: React.FC<ContextMenuProps> = ({
  actions,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  

  const enabledIndices = actions
    .map((action, index) => (!action.disabled ? index : -1))
    .filter(index => index !== -1);
  

  const toggleMenu = () => {
    if (!isOpen && buttonRef.current) {
    
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
   
      setDropdownPosition(spaceBelow < 200 && spaceAbove > spaceBelow ? 'above' : 'below');
  
      setFocusedIndex(enabledIndices[0] ?? 0);
    }
    setIsOpen(!isOpen);
  };
  
  const closeMenu = () => {
    setIsOpen(false);
    setFocusedIndex(0);
  };

  const handleActionClick = (action: ContextMenuAction) => {
    if (!action.disabled) {
      action.onClick();
      closeMenu();

      buttonRef.current?.focus();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'Escape':

          event.preventDefault();
          closeMenu();
          buttonRef.current?.focus();
          break;
          
        case 'ArrowDown':

          event.preventDefault();
          const currentDownIndex = enabledIndices.indexOf(focusedIndex);
          const nextDownIndex = (currentDownIndex + 1) % enabledIndices.length;
          setFocusedIndex(enabledIndices[nextDownIndex]);
          break;
          
        case 'ArrowUp':
 
          event.preventDefault();
          const currentUpIndex = enabledIndices.indexOf(focusedIndex);
          const nextUpIndex = currentUpIndex === 0 
            ? enabledIndices.length - 1 
            : currentUpIndex - 1;
          setFocusedIndex(enabledIndices[nextUpIndex]);
          break;
          
        case 'Home':
      
          event.preventDefault();
          setFocusedIndex(enabledIndices[0]);
          break;
          
        case 'End':
    
          event.preventDefault();
          setFocusedIndex(enabledIndices[enabledIndices.length - 1]);
          break;
          
        case 'Enter':
        case ' ':

          event.preventDefault();
          const focusedAction = actions[focusedIndex];
          if (focusedAction && !focusedAction.disabled) {
            handleActionClick(focusedAction);
          }
          break;
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, focusedIndex, enabledIndices, actions]);
  

  useEffect(() => {
    if (isOpen && menuItemRefs.current[focusedIndex]) {
      menuItemRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);
  
  return (
    <div className={`relative inline-block ${className}`}>

      <button
        ref={buttonRef}
        id="context-menu-button"
        type="button"
        onClick={toggleMenu}
        className="
          inline-flex items-center justify-center
          w-8 h-8 rounded-full
          text-dark_green
          hover:bg-light_green
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark_green
          transition-colors duration-200
        "
        aria-label="Abrir menu de ações"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={isOpen ? 'context-menu-dropdown' : undefined}
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id="context-menu-dropdown"
          className={`
            absolute right-0 z-50
            min-w-40 mt-2
            bg-white rounded-md shadow-lg
            border border-gray-200
            py-1
            ${dropdownPosition === 'above' ? 'bottom-full mb-2' : 'top-full'}
          `}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="context-menu-button"
        >
          {actions.map((action, index) => (
            <React.Fragment key={`action-${index}`}>
              <button
                ref={(el) => {
                  menuItemRefs.current[index] = el;
                }}
                type="button"
                onClick={() => handleActionClick(action)}
                disabled={action.disabled}
                className={`
                  w-full text-left px-4 py-2
                  flex items-center gap-2
                  font-poppins text-sm
                  transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-inset focus:ring-dark_green
                  ${
                    action.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-dark_green hover:bg-light_green cursor-pointer'
                  }
                `}
                role="menuitem"
                tabIndex={-1}
                aria-disabled={action.disabled}
              >
                {action.icon && (
                  <span className="flex items-center" aria-hidden="true">
                    {action.icon}
                  </span>
                )}
                <span>{action.label}</span>
              </button>
              {action.divider && index < actions.length - 1 && (
                <div className="border-t border-gray-200 my-1" role="separator" aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContextMenu;
