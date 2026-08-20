'use client';

import { EmployerRegistration } from '@/types/registration';
import { 
  orgTypeOptions,
  teamSizeOptions, 
  animalTypeOptions, 
  clinicTypeOptions,
  wholesaleActivityOptions,
  territoryOptions,
  wholesalePositionOptions,
  farmAnimalOptions,
  farmSizeOptions
} from '@/data/orgTypes';

interface Step2Props {
  formData: EmployerRegistration;
  onChange: (field: string, value: any) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export default function Step2MainForm({ formData, onChange, onBack, onSubmit }: Step2Props) {
  const selectedOrgType = orgTypeOptions.find(
    (option) => option.id === formData.orgType
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleCheckboxChange = (field: string, value: string, checked: boolean) => {
    const currentValues =
      (formData.additionalData[
        field as keyof typeof formData.additionalData
      ] as string[]) || [];

    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter((v) => v !== value);

    onChange(`additionalData.${field}`, newValues);
  };

  return (
    <form className="step-container" onSubmit={handleSubmit}>
      <div className="step-header">
        <h1 className="step-title">Registracija darbdaviui</h1>
        <p className="step-description">
          Užpildykite informaciją apie savo organizaciją
        </p>
      </div>

      <div className="form-sections">
        {/* Organizacijos informacija */}
        <div className="form-section">
          <h2 className="form-section-title">Organizacijos informacija</h2>

          <div className="form-group">
            <label className="form-label">Organizacijos pavadinimas *</label>
            <input
              type="text"
              className="form-input"
              value={formData.orgName}
              onChange={(e) => onChange('orgName', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Organizacijos tipas</label>
            <input
              type="text"
              className="form-input"
              value={selectedOrgType?.label || ''}
              disabled
              style={{ background: '#f5f5f7', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Miestas / vietovė *</label>
              <input
                type="text"
                className="form-input"
                value={formData.city}
                onChange={(e) => onChange('city', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Interneto svetainė</label>
              <input
                type="url"
                className="form-input"
                placeholder="https://"
                value={formData.website}
                onChange={(e) => onChange('website', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Trumpai apie organizaciją *</label>
            <textarea
              className="form-textarea"
              rows={4}
              value={formData.description}
              onChange={(e) => onChange('description', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Komandos dydis *</label>
            <div className="radio-group">
              {teamSizeOptions.map((size) => (
                <label key={size} className="radio-label">
                  <input
                    type="radio"
                    name="teamSize"
                    value={size}
                    checked={formData.teamSize === size}
                    onChange={(e) => onChange('teamSize', e.target.value)}
                    required
                  />
                  <span>{size}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Veterinarijos klinika */}
        {formData.orgType === 'clinic' && (
          <div className="form-section">
            <h2 className="form-section-title">Klinikos informacija</h2>

            <div className="form-group">
              <label className="form-label">
                Su kokiais gyvūnais dirbate? *
              </label>

              <div className="checkbox-group">
                {animalTypeOptions.map((animal) => (
                  <label key={animal} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={(formData.additionalData.animalTypes || []).includes(
                        animal
                      )}
                      onChange={(e) =>
                        handleCheckboxChange(
                          'animalTypes',
                          animal,
                          e.target.checked
                        )
                      }
                    />
                    <span>{animal}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Klinikos tipas *</label>

              <div className="radio-group">
                {clinicTypeOptions.map((type) => (
                  <label key={type} className="radio-label">
                    <input
                      type="radio"
                      name="clinicType"
                      value={type}
                      checked={formData.additionalData.clinicType === type}
                      onChange={(e) =>
                        onChange(
                          'additionalData.clinicType',
                          e.target.value
                        )
                      }
                      required
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Kiek veterinarijos gydytojų dirba komandoje? *
              </label>

              <input
                type="number"
                className="form-input"
                min="0"
                value={formData.additionalData.vetCount || ''}
                onChange={(e) =>
                  onChange('additionalData.vetCount', e.target.value)
                }
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="checkbox-label-single">
                  <input
                    type="checkbox"
                    checked={
                      formData.additionalData.acceptsInterns || false
                    }
                    onChange={(e) =>
                      onChange(
                        'additionalData.acceptsInterns',
                        e.target.checked
                      )
                    }
                  />
                  <span>Priimame studentus praktikai</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label-single">
                  <input
                    type="checkbox"
                    checked={
                      formData.additionalData.hasMultipleLocations || false
                    }
                    onChange={(e) =>
                      onChange(
                        'additionalData.hasMultipleLocations',
                        e.target.checked
                      )
                    }
                  />
                  <span>Turime kelias klinikas / padalinius</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Didmena / distributorius */}
        {formData.orgType === 'wholesale' && (
          <div className="form-section">
            <h2 className="form-section-title">
              Didmenos / distributoriaus informacija
            </h2>

            <div className="form-group">
              <label className="form-label">Pagrindinė veiklos sritis *</label>

              <div className="checkbox-group">
                {wholesaleActivityOptions.map((activity) => (
                  <label key={activity} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={(
                        formData.additionalData.mainActivity || []
                      ).includes(activity)}
                      onChange={(e) =>
                        handleCheckboxChange(
                          'mainActivity',
                          activity,
                          e.target.checked
                        )
                      }
                    />
                    <span>{activity}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Veiklos teritorija *</label>

              <select
                className="form-select"
                value={
                  formData.additionalData.operatingTerritory || ''
                }
                onChange={(e) =>
                  onChange(
                    'additionalData.operatingTerritory',
                    e.target.value
                  )
                }
                required
              >
                <option value="">Pasirinkite...</option>

                {territoryOptions.map((territory) => (
                  <option key={territory} value={territory}>
                    {territory}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Kokius specialistus dažniausiai samdote? *
              </label>

              <div className="checkbox-group">
                {wholesalePositionOptions.map((position) => (
                  <label key={position} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={(
                        formData.additionalData.typicalPositions || []
                      ).includes(position)}
                      onChange={(e) =>
                        handleCheckboxChange(
                          'typicalPositions',
                          position,
                          e.target.checked
                        )
                      }
                    />
                    <span>{position}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Farmacinė įmonė */}
        {formData.orgType === 'pharma' && (
          <div className="form-section">
            <h2 className="form-section-title">
              Farmacinės įmonės informacija
            </h2>

            <div className="form-group">
              <label className="form-label">
                Veiklos sritis / produktų kategorijos *
              </label>

              <textarea
                className="form-textarea"
                rows={3}
                value={formData.additionalData.activityArea || ''}
                onChange={(e) =>
                  onChange(
                    'additionalData.activityArea',
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="checkbox-label-single">
                  <input
                    type="checkbox"
                    checked={
                      formData.additionalData.salesRelated || false
                    }
                    onChange={(e) =>
                      onChange(
                        'additionalData.salesRelated',
                        e.target.checked
                      )
                    }
                  />
                  <span>Pozicijos susijusios su pardavimais</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label-single">
                  <input
                    type="checkbox"
                    checked={
                      formData.additionalData.hiresVetSpecialists || false
                    }
                    onChange={(e) =>
                      onChange(
                        'additionalData.hiresVetSpecialists',
                        e.target.checked
                      )
                    }
                  />
                  <span>Samdo techninius veterinarijos specialistus</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Darbo teritorija *</label>

              <input
                type="text"
                className="form-input"
                value={
                  formData.additionalData.workTerritory || ''
                }
                onChange={(e) =>
                  onChange(
                    'additionalData.workTerritory',
                    e.target.value
                  )
                }
                placeholder="pvz. Lietuva, Baltijos šalys, Europa"
                required
              />
            </div>
          </div>
        )}

        {/* Ūkis */}
        {formData.orgType === 'farm' && (
          <div className="form-section">
            <h2 className="form-section-title">Ūkio informacija</h2>

            <div className="form-group">
              <label className="form-label">Gyvūnų rūšis *</label>

              <div className="checkbox-group">
                {farmAnimalOptions.map((animal) => (
                  <label key={animal} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={(
                        formData.additionalData.animalSpecies || []
                      ).includes(animal)}
                      onChange={(e) =>
                        handleCheckboxChange(
                          'animalSpecies',
                          animal,
                          e.target.checked
                        )
                      }
                    />
                    <span>{animal}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Ūkio dydžio kategorija *
              </label>

              <select
                className="form-select"
                value={formData.additionalData.farmSize || ''}
                onChange={(e) =>
                  onChange(
                    'additionalData.farmSize',
                    e.target.value
                  )
                }
                required
              >
                <option value="">Pasirinkite...</option>

                {farmSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="checkbox-label-single">
                  <input
                    type="checkbox"
                    checked={
                      formData.additionalData.hasPermanentVet || false
                    }
                    onChange={(e) =>
                      onChange(
                        'additionalData.hasPermanentVet',
                        e.target.checked
                      )
                    }
                  />
                  <span>Turime nuolatinį veterinarijos gydytoją</span>
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label-single">
                  <input
                    type="checkbox"
                    checked={
                      formData.additionalData.acceptsStudents || false
                    }
                    onChange={(e) =>
                      onChange(
                        'additionalData.acceptsStudents',
                        e.target.checked
                      )
                    }
                  />
                  <span>Priimame studentus praktikai</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* VMVT / valstybinė institucija */}
        {formData.orgType === 'government' && (
          <div className="form-section">
            <h2 className="form-section-title">
              Institucijos informacija
            </h2>

            <div className="form-group">
              <label className="form-label">
                Institucijos / padalinio pavadinimas *
              </label>

              <input
                type="text"
                className="form-input"
                value={
                  formData.additionalData.institutionName || ''
                }
                onChange={(e) =>
                  onChange(
                    'additionalData.institutionName',
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Regionas *</label>

              <input
                type="text"
                className="form-input"
                value={formData.additionalData.region || ''}
                onChange={(e) =>
                  onChange(
                    'additionalData.region',
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Kokio pobūdžio specialistus dažniausiai samdote? *
              </label>

              <textarea
                className="form-textarea"
                rows={3}
                value={
                  formData.additionalData.specialistTypes || ''
                }
                onChange={(e) =>
                  onChange(
                    'additionalData.specialistTypes',
                    e.target.value
                  )
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label-single">
                <input
                  type="checkbox"
                  checked={
                    formData.additionalData.offersInternships || false
                  }
                  onChange={(e) =>
                    onChange(
                      'additionalData.offersInternships',
                      e.target.checked
                    )
                  }
                />
                <span>Siūlome praktikos / stažuočių vietas</span>
              </label>
            </div>
          </div>
        )}

        {/* Kiti organizacijų tipai */}
        {[
          'pharmacy',
          'university',
          'laboratory',
          'shelter',
          'other'
        ].includes(formData.orgType) && (
          <div className="form-section">
            <h2 className="form-section-title">
              Papildoma informacija
            </h2>

            <div className="form-group">
              <label className="form-label">
                Trumpai apibūdinkite savo veiklos sritį *
              </label>

              <textarea
                className="form-textarea"
                rows={4}
                value={
                  formData.additionalData.activityDescription || ''
                }
                onChange={(e) =>
                  onChange(
                    'additionalData.activityDescription',
                    e.target.value
                  )
                }
                placeholder="Aprašykite savo organizacijos veiklą ir kokius specialistus dažniausiai ieškote..."
                required
              />
            </div>
          </div>
        )}

        {/* Kontaktinis asmuo */}
        <div className="form-section">
          <h2 className="form-section-title">Kontaktinis asmuo</h2>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vardas *</label>
              <input
                type="text"
                className="form-input"
                value={formData.firstName}
                onChange={(e) =>
                  onChange('firstName', e.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pavardė *</label>
              <input
                type="text"
                className="form-input"
                value={formData.lastName}
                onChange={(e) =>
                  onChange('lastName', e.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Pareigos *</label>
              <input
                type="text"
                className="form-input"
                value={formData.position}
                onChange={(e) =>
                  onChange('position', e.target.value)
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Telefonas</label>
              <input
                type="tel"
                className="form-input"
                value={formData.phone}
                onChange={(e) =>
                  onChange('phone', e.target.value)
                }
                placeholder="+370..."
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">El. paštas *</label>

            <input
              type="email"
              className="form-input"
              value={formData.email}
              onChange={(e) =>
                onChange('email', e.target.value)
              }
              required
            />
          </div>
        </div>

        {/* Paskyra */}
        <div className="form-section">
          <h2 className="form-section-title">Paskyra</h2>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Slaptažodis *</label>

              <input
                type="password"
                className="form-input"
                value={formData.password}
                onChange={(e) =>
                  onChange('password', e.target.value)
                }
                minLength={8}
                required
              />

              <span className="form-hint">
                Mažiausiai 8 simboliai
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">
                Pakartoti slaptažodį *
              </label>

              <input
                type="password"
                className="form-input"
                value={formData.confirmPassword}
                onChange={(e) =>
                  onChange('confirmPassword', e.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label-single">
              <input
                type="checkbox"
                checked={formData.agreedToTerms}
                onChange={(e) =>
                  onChange('agreedToTerms', e.target.checked)
                }
                required
              />

              <span>
                Sutinku su{' '}
                <a href="#" className="form-link">
                  naudojimosi taisyklėmis
                </a>{' '}
                ir{' '}
                <a href="#" className="form-link">
                  privatumo politika
                </a>{' '}
                *
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="step-actions">
        <button
          type="button"
          className="btn btn-secondary btn-large"
          onClick={onBack}
        >
          ← Atgal
        </button>

        <button
          type="submit"
          className="btn btn-primary btn-large"
        >
          Sukurti darbdavio paskyrą
        </button>
      </div>
    </form>
  );
}