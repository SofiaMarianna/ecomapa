import { useEffect, useRef, useState } from 'react';
import {
  createEcoPoint,
  getMaterials,
  reverseGeocode,
  searchGeocode,
} from '../services/api.js';
import LocationPickerMap from '../map/LocationPickerMap.jsx';

const INITIAL_MAP_CENTER = [-6.8891, -38.5612];

function locationsMatch(first, second) {
  return first?.latitude === second?.latitude
    && first?.longitude === second?.longitude;
}

export default function CreateEcoPointForm({ onCancel, onCreated }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [materials, setMaterials] = useState([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState(() => new Set());
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [materialsError, setMaterialsError] = useState(null);
  const [materialsRetry, setMaterialsRetry] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseError, setReverseError] = useState(null);
  const [addressNeedsReview, setAddressNeedsReview] = useState(false);
  const [addressReviewConfirmed, setAddressReviewConfirmed] = useState(false);
  const [location, setLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(INITIAL_MAP_CENTER);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const locationRef = useRef(location);
  const addressSourceRef = useRef(null);
  const searchControllerRef = useRef(null);
  const reverseControllerRef = useRef(null);
  const isSubmittingRef = useRef(isSubmitting);
  const onCancelRef = useRef(onCancel);
  isSubmittingRef.current = isSubmitting;
  onCancelRef.current = onCancel;

  useEffect(() => {
    const controller = new AbortController();
    setMaterialsLoading(true);
    setMaterialsError(null);

    getMaterials({ signal: controller.signal })
      .then((result) => {
        if (!Array.isArray(result)) {
          throw new Error('A API retornou uma lista de materiais inválida.');
        }

        setMaterials(result);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setMaterialsError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setMaterialsLoading(false);
        }
      });

    return () => controller.abort();
  }, [materialsRetry]);

  useEffect(() => () => {
    const searchController = searchControllerRef.current;
    const reverseController = reverseControllerRef.current;
    searchControllerRef.current = null;
    reverseControllerRef.current = null;
    searchController?.abort();
    reverseController?.abort();
  }, []);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousBodyOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmittingRef.current) {
        onCancelRef.current();
      }

      if (event.key !== 'Tab' || !dialog) {
        return;
      }

      const focusableElements = Array.from(dialog.querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]',
      )).filter((element) => {
        const tabIndexAttribute = element.getAttribute('tabindex');
        const hasValidTabIndex = tabIndexAttribute === null
          || /^[+-]?\d+$/.test(tabIndexAttribute.trim());
        const computedStyle = window.getComputedStyle(element);

        return hasValidTabIndex
          && element.tabIndex >= 0
          && !element.matches(':disabled, [aria-disabled="true"]')
          && !element.closest('[hidden], [inert], [aria-hidden="true"], [aria-disabled="true"]')
          && element.getClientRects().length > 0
          && computedStyle.visibility === 'visible'
          && computedStyle.opacity !== '0';
      });
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement)?.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    dialog?.querySelector('input')?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  async function handleAddressSearch(event) {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query || searchLoading) {
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setHasSearched(true);
    const controller = new AbortController();
    searchControllerRef.current?.abort();
    searchControllerRef.current = controller;

    try {
      const results = await searchGeocode(query, { signal: controller.signal });
      if (controller.signal.aborted || searchControllerRef.current !== controller) {
        return;
      }
      if (!Array.isArray(results)) {
        throw new Error('A API retornou uma lista de endereços inválida.');
      }
      setSearchResults(results);
    } catch (error) {
      if (
        error.name !== 'AbortError' &&
        !controller.signal.aborted &&
        searchControllerRef.current === controller
      ) {
        setSearchError(error.message);
      }
    } finally {
      if (searchControllerRef.current === controller) {
        searchControllerRef.current = null;
        setSearchLoading(false);
      }
    }
  }

  function updateLocation(nextLocation, { markAddressStale = false } = {}) {
    const previousLocation = locationRef.current;
    reverseControllerRef.current?.abort();
    reverseControllerRef.current = null;
    locationRef.current = nextLocation;
    setLocation(nextLocation);
    setReverseLoading(false);
    setReverseError(null);

    if (markAddressStale && !locationsMatch(previousLocation, nextLocation)) {
      const hasAddress = address.trim().length > 0;
      setAddressNeedsReview(hasAddress);
      setAddressReviewConfirmed(false);
    }
  }

  function handleSelectSearchResult(result) {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setSearchError('O resultado selecionado possui coordenadas inválidas.');
      return;
    }

    updateLocation({ latitude, longitude });
    setAddress(result.display_name || '');
    addressSourceRef.current = 'search';
    setAddressNeedsReview(false);
    setAddressReviewConfirmed(false);
    setMapCenter([latitude, longitude]);
    setFieldErrors((current) => ({ ...current, address: undefined, location: undefined }));
    setSearchResults([]);
    setHasSearched(false);
  }

  async function handleReverseGeocode() {
    const requestedLocation = locationRef.current;
    if (!requestedLocation) {
      return;
    }

    reverseControllerRef.current?.abort();
    const controller = new AbortController();
    reverseControllerRef.current = controller;
    setReverseLoading(true);
    setReverseError(null);

    try {
      const result = await reverseGeocode(
        requestedLocation.latitude,
        requestedLocation.longitude,
        { signal: controller.signal },
      );
      if (
        controller.signal.aborted ||
        reverseControllerRef.current !== controller ||
        !locationsMatch(locationRef.current, requestedLocation)
      ) {
        return;
      }

      if (typeof result?.display_name === 'string' && result.display_name.trim()) {
        setAddress(result.display_name);
        addressSourceRef.current = 'reverse';
        setAddressNeedsReview(false);
        setAddressReviewConfirmed(false);
        setFieldErrors((current) => ({ ...current, address: undefined }));
      } else {
        setReverseError('Não foi encontrado um endereço para estas coordenadas.');
      }
    } catch (error) {
      if (
        error.name !== 'AbortError' &&
        !controller.signal.aborted &&
        reverseControllerRef.current === controller &&
        locationsMatch(locationRef.current, requestedLocation)
      ) {
        setReverseError(error.message);
      }
    } finally {
      if (reverseControllerRef.current === controller) {
        reverseControllerRef.current = null;
        setReverseLoading(false);
      }
    }
  }

  function handleLocationSelect(nextLocation) {
    updateLocation(nextLocation, { markAddressStale: true });
    setFieldErrors((current) => ({ ...current, location: undefined }));
  }

  function toggleMaterial(materialId) {
    setSelectedMaterialIds((current) => {
      const next = new Set(current);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
    setFieldErrors((current) => ({ ...current, materials: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedAddress = address.trim();
    const nextErrors = {};

    if (!normalizedName) {
      nextErrors.name = 'Informe o nome do ponto.';
    } else if (Array.from(normalizedName).length > 120) {
      nextErrors.name = 'O nome deve ter no máximo 120 caracteres.';
    }

    if (!normalizedAddress) {
      nextErrors.address = 'Informe o endereço do ponto.';
    }

    if (addressNeedsReview && !addressReviewConfirmed) {
      nextErrors.address = 'Confirme que o endereço ainda corresponde à localização selecionada.';
    }

    if (
      !location ||
      !Number.isFinite(location.latitude) ||
      location.latitude < -90 ||
      location.latitude > 90 ||
      !Number.isFinite(location.longitude) ||
      location.longitude < -180 ||
      location.longitude > 180
    ) {
      nextErrors.location = 'Selecione uma localização no mapa ou pela pesquisa.';
    }

    if (selectedMaterialIds.size === 0) {
      nextErrors.materials = 'Selecione pelo menos um material aceito.';
    }

    setFieldErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const createdPoint = await createEcoPoint({
        name: normalizedName,
        address: normalizedAddress,
        description: description.trim() || null,
        latitude: location.latitude,
        longitude: location.longitude,
        material_ids: Array.from(selectedMaterialIds),
      });
      onCreated(createdPoint);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  const addressDescriptionIds = [
    fieldErrors.address && 'point-address-error',
    addressNeedsReview && 'address-review-warning',
  ].filter(Boolean).join(' ') || undefined;

  return (
    <div
      className="create-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onCancel();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-point-title"
        tabIndex="-1"
      >
        <div className="create-modal-heading">
          <div>
            <p className="eyebrow">Novo local de coleta</p>
            <h2 id="create-point-title">Cadastrar ponto</h2>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Fechar cadastro"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <form className="create-form" onSubmit={handleSubmit} noValidate>
          <div className="create-form-fields">
            <label className="form-field" htmlFor="point-name">
              <span>Nome <span aria-hidden="true">*</span></span>
              <input
                id="point-name"
                name="name"
                type="text"
                maxLength={120}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setFieldErrors((current) => ({ ...current, name: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'point-name-error' : undefined}
                required
              />
              {fieldErrors.name && (
                <span className="field-error" id="point-name-error">{fieldErrors.name}</span>
              )}
            </label>

            <div className="form-field">
              <label className="form-field-label" htmlFor="point-address">
                Endereço <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="point-address"
                name="address"
                rows="2"
                value={address}
                onChange={(event) => {
                  reverseControllerRef.current?.abort();
                  reverseControllerRef.current = null;
                  setReverseLoading(false);
                  setReverseError(null);
                  setAddress(event.target.value);
                  addressSourceRef.current = 'manual';
                  setAddressNeedsReview(false);
                  setAddressReviewConfirmed(false);
                  setFieldErrors((current) => ({ ...current, address: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.address)}
                aria-describedby={addressDescriptionIds}
                required
              />
              {fieldErrors.address && (
                <span className="field-error" id="point-address-error">{fieldErrors.address}</span>
              )}
              {(addressNeedsReview || addressReviewConfirmed) && (
                <div className="address-review-control">
                  {addressNeedsReview && (
                    <span className="address-review-warning" id="address-review-warning" role="status">
                      A localização mudou. Confira se o endereço ainda corresponde ao marcador ou obtenha
                      uma nova sugestão pelas coordenadas.
                    </span>
                  )}
                  <label className="address-review-confirmation">
                    <input
                      type="checkbox"
                      checked={addressReviewConfirmed}
                      aria-describedby={fieldErrors.address ? 'point-address-error' : undefined}
                      onChange={(event) => {
                        const confirmed = event.target.checked;
                        setAddressReviewConfirmed(confirmed);
                        setAddressNeedsReview(!confirmed);
                        if (confirmed) {
                          setFieldErrors((current) => ({ ...current, address: undefined }));
                        }
                      }}
                    />
                    <span>Confirmo que o endereço informado corresponde à localização selecionada</span>
                  </label>
                </div>
              )}
            </div>

            <label className="form-field" htmlFor="point-description">
              <span>Descrição <span className="field-optional">(opcional)</span></span>
              <textarea
                id="point-description"
                name="description"
                rows="3"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <fieldset
              className="materials-fieldset"
              aria-invalid={Boolean(fieldErrors.materials)}
              aria-describedby={fieldErrors.materials ? 'materials-error' : undefined}
            >
              <legend>Materiais aceitos <span aria-hidden="true">*</span></legend>

              {materialsLoading && (
                <p className="state-message" role="status">
                  <span className="loading-dot" aria-hidden="true" />
                  Carregando materiais…
                </p>
              )}
              {materialsError && (
                <div className="state-message state-message--error" role="alert">
                  <p>Não foi possível carregar os materiais. {materialsError}</p>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setMaterialsRetry((retry) => retry + 1)}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
              {!materialsLoading && !materialsError && materials.length === 0 && (
                <p className="state-message">Nenhum material disponível no momento.</p>
              )}
              {!materialsLoading && !materialsError && materials.length > 0 && (
                <ul className="material-options">
                  {materials.map((material) => (
                    <li key={material.id}>
                      <label className="material-option">
                        <input
                          type="checkbox"
                          checked={selectedMaterialIds.has(material.id)}
                          onChange={() => toggleMaterial(material.id)}
                        />
                        <span>{material.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              {fieldErrors.materials && (
                <span className="field-error" id="materials-error">{fieldErrors.materials}</span>
              )}
            </fieldset>

            <section className="address-search" aria-labelledby="address-search-title">
              <h3 id="address-search-title">Pesquisar endereço</h3>
              <div className="address-search-controls">
                <label className="visually-hidden" htmlFor="address-search-query">
                  Endereço ou localidade para pesquisar
                </label>
                <input
                  id="address-search-query"
                  type="search"
                  value={searchQuery}
                  disabled={searchLoading}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setHasSearched(false);
                    setSearchResults([]);
                    setSearchError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleAddressSearch(event);
                    }
                  }}
                  placeholder="Ex.: Praça João Pessoa, Cajazeiras"
                />
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleAddressSearch}
                  disabled={!searchQuery.trim() || searchLoading}
                >
                  {searchLoading ? 'Pesquisando…' : 'Pesquisar'}
                </button>
              </div>
              {searchLoading && (
                <p className="state-message" role="status">
                  <span className="loading-dot" aria-hidden="true" />
                  Buscando endereços…
                </p>
              )}
              {searchError && <p className="field-error" role="alert">{searchError}</p>}
              {!searchLoading && hasSearched && !searchError && searchResults.length === 0 && (
                <p className="state-message">Nenhum endereço encontrado.</p>
              )}
              {searchResults.length > 0 && (
                <ul className="geocode-results" aria-label="Resultados da pesquisa de endereço">
                  {searchResults.map((result, index) => (
                    <li key={`${result.osm_type || 'result'}-${result.osm_id || index}`}>
                      <button
                        type="button"
                        onClick={() => handleSelectSearchResult(result)}
                      >
                        {result.display_name || 'Endereço sem descrição'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="location-section" aria-labelledby="location-heading">
            <div className="location-heading">
              <div>
                <h3 id="location-heading">Localização no mapa</h3>
                <p>Clique no mapa para marcar o local exato.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={handleReverseGeocode}
                disabled={!location || reverseLoading}
              >
                {reverseLoading ? 'Obtendo endereço…' : 'Obter endereço pelas coordenadas'}
              </button>
            </div>
            {reverseError && <p className="field-error" role="alert">{reverseError}</p>}
            <LocationPickerMap
              selectedLocation={location}
              center={mapCenter}
              onLocationSelect={handleLocationSelect}
            />
            {location && (
              <p className="coordinates-note" aria-live="polite">
                Coordenadas: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
              </p>
            )}
            {fieldErrors.location && (
              <p className="field-error" id="location-error">{fieldErrors.location}</p>
            )}
          </section>

          {submitError && (
            <p className="form-submit-error" role="alert">
              Não foi possível cadastrar o ponto. {submitError}
            </p>
          )}

          <div className="create-form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Cadastrando…' : 'Salvar ponto'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
