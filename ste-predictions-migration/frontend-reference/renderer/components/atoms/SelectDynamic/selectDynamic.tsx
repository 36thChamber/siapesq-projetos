import React, { useState, useEffect, useRef } from 'react';
import { Species, SpeciesSelectProps } from './types';

export const SelectDynamic: React.FC<SpeciesSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Selecione uma espécie",
  disabled = false,
  className = "",
  label = "Seleção de espécie",
  triggerIcon,
  count,
  variant = 'default',
  showSelectedIcon = true
}) => {

  if (!Array.isArray(options)) {
    console.error('SpeciesSelect: options must be an array');
    return (
      <div className={`relative ${className}`}>
        <div className="w-full px-4 py-3 border border-red-300 rounded-lg bg-red-50 text-red-700">
          Erro: options deve ser um array
        </div>
      </div>
    );
  }


  const validOptions = options.filter(species => {
    if (!species.id || !species.nome) {
      console.warn('SpeciesSelect: species must have id and nome', species);
      return false;
    }
    return true;
  });

 
  const [isOpen, setIsOpen] = useState(false);
  
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedSpecies = validOptions.find((s: Species) => s.id === value);
  

  useEffect(() => {

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
    if (isOpen) {

      const selectedIndex = validOptions.findIndex((s: Species) => s.id === value);
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen, validOptions, value]);

  const handleSelect = (species: Species) => {

    if (onChange) {

      onChange(species);
    }

    setIsOpen(false);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {

    if (disabled) return;
    
    switch (event.key) {
      case 'Enter':
      case ' ': 
        event.preventDefault();
        if (!isOpen) {
   
          setIsOpen(true);
        } else if (focusedIndex >= 0 && focusedIndex < validOptions.length) {

          handleSelect(validOptions[focusedIndex]);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
 
        setIsOpen(false);
        break;
        
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
      
          setIsOpen(true);
        } else {
 
          setFocusedIndex((prev: number) => 
            prev < validOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {

          setFocusedIndex((prev: number) => prev > 0 ? prev - 1 : prev);
        }
        break;
        
      case 'Home':
        if (isOpen) {
          event.preventDefault();
   
          setFocusedIndex(0);
        }
        break;
        
      case 'End':
        if (isOpen) {
          event.preventDefault();

          setFocusedIndex(validOptions.length - 1);
        }
        break;
    }
  };
  
  return (
    <>
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div ref={dropdownRef} className={`relative ${className}`}>

        <div className="w-full">
 
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          aria-label={label}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? "species-listbox" : undefined}
          className={`
            w-full border rounded-lg 
            flex items-center justify-between gap-3
            transition-all duration-200 ease-in-out
            ${variant === 'simple' 
              ? 'px-3 py-2 text-sm' 
              : 'px-4 py-3'
            }
            ${disabled 
              ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' 
              : variant === 'simple'
                ? 'border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 cursor-pointer bg-white'
                : 'border-gray-300 hover:border-blue-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer bg-white'
            }
            ${isOpen 
              ? variant === 'simple' 
                ? 'border-gray-400 ring-1 ring-gray-400' 
                : 'border-blue-500 ring-2 ring-blue-500' 
              : ''
            }
          `}
        >
 
          <div className="flex items-center gap-3 flex-1 min-w-0">
   
            {(triggerIcon || (showSelectedIcon && selectedSpecies?.icon)) && (
              <img 
                src={triggerIcon || selectedSpecies?.icon} 
                alt={selectedSpecies?.nome || 'Ícone'}
                className={`object-cover rounded-md shrink-0 border border-gray-200 ${
                  variant === 'simple' ? 'w-6 h-6' : 'w-8 h-8'
                }`}
                onError={handleImageError}
              />
            )}
      
            <span className={`text-left truncate ${
              variant === 'simple' ? 'text-sm' : 'text-base'
            } ${selectedSpecies ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              {selectedSpecies ? selectedSpecies.nome : placeholder}
            </span>

            {count !== undefined && count > 0 && (
              <span className={`ml-auto shrink-0 ${
                variant === 'simple' 
                  ? 'text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded' 
                  : 'text-sm bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium'
              }`}>
                {count}
              </span>
            )}
          </div>
   
          <svg 
            className={`shrink-0 transition-transform duration-200 text-gray-500 ${
              variant === 'simple' ? 'w-4 h-4' : 'w-5 h-5'
            } ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
   
        {isOpen && (
          <div 
            className="absolute w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto
                       animate-in fade-in slide-in-from-top-2 duration-200
                       scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-50 scrollbar-thumb-rounded"
            style={{
              animation: 'slideDown 0.2s ease-out'
            }}
          >
         
            {validOptions.length === 0 ? (
              <div className="px-4 py-8 text-gray-500 text-center text-sm">
                Nenhuma espécie disponível
              </div>
            ) : (
         
              <ul 
                role="listbox" 
                id="species-listbox"
                aria-label={label}
                className="py-1"
              >
                {validOptions.map((species: Species, index: number) => {
                const isSelected = species.id === value;
                const isFocused = index === focusedIndex;
                
                return (
                  <li
                    key={species.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(species)}
                    className={`
                      cursor-pointer transition-colors duration-150
                      ${variant === 'simple' ? 'px-3 py-2' : 'px-4 py-3'}
                      ${variant === 'simple' 
                        ? 'hover:bg-gray-100' 
                        : 'hover:bg-blue-50'
                      }
                      ${isSelected 
                        ? variant === 'simple'
                          ? 'bg-gray-100 border-l-2 border-gray-500'
                          : 'bg-blue-50 border-l-4 border-blue-500'
                        : variant === 'simple'
                          ? 'border-l-2 border-transparent'
                          : 'border-l-4 border-transparent'
                      }
                      ${isFocused 
                        ? variant === 'simple'
                          ? 'bg-gray-50 ring-1 ring-inset ring-gray-400'
                          : 'bg-gray-100 ring-2 ring-inset ring-blue-400'
                        : ''
                      }
                    `}
                  >
           
                    <div className="flex items-start gap-3">
                
                      {species.icon && variant === 'default' && (
                        <img 
                          src={species.icon} 
                          alt={species.nome}
                          className="w-10 h-10 object-cover rounded-md shrink-0 border border-gray-200"
                          onError={handleImageError}
                        />
                      )}
                      
                      {species.icon && variant === 'simple' && (
                        <img 
                          src={species.icon} 
                          alt={species.nome}
                          className="w-6 h-6 object-cover rounded shrink-0 border border-gray-200"
                          onError={handleImageError}
                        />
                      )}
                      
                     
                      <div className="flex-1 min-w-0">
                   
                        <div className={`font-semibold text-gray-900 leading-tight ${
                          variant === 'simple' ? 'text-sm' : 'text-base'
                        }`}>
                          {species.nome}
                        </div>
                        
                       
                        {species.nome_cientifico && variant === 'default' && (
                          <div className="text-sm italic text-gray-600 mt-1 leading-tight">
                            {species.nome_cientifico}
                          </div>
                        )}
                        
                        {/* Exibição de grupo quando presente (apenas em variant default) */}
                        {species.grupo && variant === 'default' && (
                          <div className="text-xs text-gray-500 mt-1.5 font-medium">
                            {species.grupo}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
              </ul>
            )}
          </div>
        )}
        </div>
      </div>
    </>
  );
};
