import React from 'react';
import PageLayout from '../../../../shared/components/PageLayout';
import Breadcrumb from '../../../../shared/components/Breadcrumb';

const AddPropertyPage: React.FC = () => {
  const steps = [
    { label: 'Informations générales', number: 1 },
    { label: 'Localisation', number: 2 },
    { label: 'Photos', number: 3 },
    { label: 'Tarif', number: 4 },
    { label: 'Validation', number: 5 }
  ];

  const popularCities = [
    { name: 'Abidjan', properties: 1200, image: '/cities/abidjan.jpg' },
    { name: 'Bouaké', properties: 150, image: '/cities/bouake.jpg' },
    { name: 'Yamoussoukro', properties: 80, image: '/cities/yamoussoukro.jpg' },
    { name: 'San-Pédro', properties: 65, image: '/cities/san-pedro.jpg' }
  ];

  return (
    <PageLayout>
      <Breadcrumb items={[
        { label: 'Accueil', href: '/' },
        { label: 'Ajouter une Propriété', href: '/ajouter-propriete' }
      ]} />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Ajouter une Propriété</h1>
        
        {/* Étapes */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-16 h-1 bg-gray-200 mx-2"></div>
                )}
              </div>
            ))}
          </div>
          <p className="text-gray-600 text-center">Étape 1 sur 5</p>
        </div>
        
        {/* Sélection de ville */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Choisissez votre ville</h2>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            {popularCities.map((city, index) => (
              <div key={index} className="bg-white p-4 rounded-lg border cursor-pointer hover:border-blue-500 transition-colors">
                <div className="text-center">
                  <h3 className="font-medium">{city.name}</h3>
                  <p className="text-sm text-gray-500">{city.properties} propriétés</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        
        {/* Formulaire */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-6">Informations générales</h2>
          <form className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type de propriété *</label>
                <select className="w-full p-3 border rounded-lg">
                  <option value="">Sélectionnez un type</option>
                  <option value="appartement">Appartement</option>
                  <option value="maison">Maison</option>
                  <option value="villa">Villa</option>
                  <option value="bureau">Bureau</option>
                  <option value="commerce">Commerce</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nombre de pièces *</label>
                <input type="number" className="w-full p-3 border rounded-lg" placeholder="Ex: 3" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Superficie (m²) *</label>
              <input type="number" className="w-full p-3 border rounded-lg" placeholder="Ex: 85" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Description *</label>
              <textarea className="w-full p-3 border rounded-lg h-24" placeholder="Décrivez votre propriété..."></textarea>
            </div>
            
            <div className="flex justify-between pt-4">
              <button type="button" className="btn-secondary">Annuler</button>
              <button type="button" className="btn-primary">Continuer</button>
            </div>
          </form>
        </div>
      </div>
    </PageLayout>
  );
};

export default AddPropertyPage;