/**
 * Démonstration des composants UI refactorisés
 * Utilise les nouveaux design tokens CSS et respecte WCAG AA
 */

import React, { useState } from 'react';
import { Button } from './Button';
import Input from './Input';
import { Card, CardHeader, CardBody, CardFooter, CardTitle, CardDescription } from './Card';

// Icônes d'exemple (sans lucide-react pour éviter les dépendances)
const MailIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const LockIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

export function UIComponentsDemo() {
  const [formData, setFormData] = useState<Record<string, string>>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData['email']) {
      newErrors['email'] = "L'adresse email est requise";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData['email'] ?? '')) {
      newErrors['email'] = "Format d'email invalide";
    }

    if (!formData['password']) {
      newErrors['password'] = 'Le mot de passe est requis';
    } else if ((formData['password']?.length ?? 0) < 8) {
      newErrors['password'] = 'Le mot de passe doit contenir au moins 8 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Simulation d'envoi
      alert('Formulaire envoyé avec succès!');
    }
  };

  return (
    <div className="container p-8">
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Section Boutons */}
        <section>
          <h2 className="text-h3 font-bold text-neutral-900 mb-6">
            Composants Button Refactorisés
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <Card padding="lg" className="space-y-4">
              <CardTitle>Tailles</CardTitle>
              <div className="space-y-3">
                <Button size="small">Petit</Button>
                <Button size="medium">Moyen</Button>
                <Button size="large">Grand</Button>
              </div>
            </Card>

            <Card padding="lg" className="space-y-4">
              <CardTitle>Variantes</CardTitle>
              <div className="space-y-3">
                <Button variant="primary">Primaire</Button>
                <Button variant="secondary">Secondaire</Button>
                <Button variant="outline">Contour</Button>
                <Button variant="ghost">Fantôme</Button>
              </div>
            </Card>

            <Card padding="lg" className="col-span-2 space-y-4">
              <CardTitle>États et Accessibilité</CardTitle>
              <div className="space-y-3">
                <Button loading>Chargement</Button>
                <Button disabled>Désactivé</Button>
                <Button fullWidth>Pleine largeur</Button>
              </div>
            </Card>
          </div>
        </section>

        {/* Section Inputs */}
        <section>
          <h2 className="text-h3 font-bold text-neutral-900 mb-6">Composants Input Refactorisés</h2>

          <Card padding="lg">
            <CardTitle>Formulaire de Test</CardTitle>
            <CardDescription>Démonstration de la validation et de l'accessibilité</CardDescription>

            <form onSubmit={handleSubmit} className="space-y-6 mt-6">
              <Input
                label="Adresse email"
                type="email"
                value={formData['email'] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('email', e.target.value)
                }
                error={errors['email']}
                helperText="Nous ne partageons jamais votre email"
                leftIcon={<MailIcon />}
                required
                fullWidth
                placeholder="votre@email.com"
              />

              <Input
                label="Mot de passe"
                type="password"
                value={formData['password'] ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleInputChange('password', e.target.value)
                }
                error={errors['password']}
                helperText="Au moins 8 caractères"
                leftIcon={<LockIcon />}
                required
                fullWidth
                placeholder="••••••••"
              />

              <div className="flex gap-3">
                <Button type="submit" variant="primary" className="flex-1">
                  Se connecter
                </Button>
                <Button type="button" variant="secondary">
                  Annuler
                </Button>
              </div>
            </form>
          </Card>
        </section>

        {/* Section Cards */}
        <section>
          <h2 className="text-h3 font-bold text-neutral-900 mb-6">Composants Card Refactorisés</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="default" padding="lg">
              <CardHeader
                title="Card Standard"
                subtitle="Avec padding minimum 32px"
                action={
                  <Button size="small" variant="outline">
                    Action
                  </Button>
                }
              />
              <CardBody>
                <p className="text-body text-neutral-700">
                  Cette card utilise les nouveaux design tokens et respecte les spécifications de
                  padding minimum.
                </p>
              </CardBody>
              <CardFooter align="right">
                <Button variant="primary">Confirmer</Button>
              </CardFooter>
            </Card>

            <Card variant="interactive" padding="lg" hoverable>
              <CardHeader title="Card Interactive" subtitle="Avec effets hover" />
              <CardBody>
                <p className="text-body text-neutral-700">
                  Cette card a des effets hover et des animations fluides utilisant les tokens de
                  design.
                </p>
              </CardBody>
            </Card>

            <Card variant="bordered" padding="xl" clickable>
              <CardHeader title="Card Cliquable" />
              <CardBody>
                <p className="text-body text-neutral-700">
                  Cette card entire est cliquable et navigable au clavier.
                </p>
              </CardBody>
            </Card>

            <Card variant="elevated" padding="lg">
              <CardTitle>Card avec Ombre</CardTitle>
              <CardDescription>Utilise les tokens d'ombre du design system</CardDescription>
              <CardBody>
                <p className="text-body text-neutral-700">
                  Les couleurs utilisent neutral-900 pour le texte principal et neutral-700 pour le
                  texte secondaire.
                </p>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* Section Accessibilité */}
        <section>
          <h2 className="text-h3 font-bold text-neutral-900 mb-6">Conformité WCAG AA</h2>

          <Card padding="lg">
            <CardTitle>Caractéristiques d'Accessibilité</CardTitle>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-h5 font-semibold text-neutral-900 mb-2">
                    Contrastes de Couleur
                  </h4>
                  <ul className="text-body text-neutral-700 space-y-1">
                    <li>• neutral-900 pour texte principal (ratio 21:1)</li>
                    <li>• neutral-700 pour texte secondaire (ratio 7.25:1)</li>
                    <li>• primary-500 pour CTAs (ratio 4.5:1 minimum)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-h5 font-semibold text-neutral-900 mb-2">
                    Navigation Clavier
                  </h4>
                  <ul className="text-body text-neutral-700 space-y-1">
                    <li>• Focus visible avec ring focus</li>
                    <li>• Tab order logique</li>
                    <li>• Touch targets minimum 44px</li>
                    <li>• ARIA labels appropriés</li>
                  </ul>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>
      </div>
    </div>
  );
}

export default UIComponentsDemo;
