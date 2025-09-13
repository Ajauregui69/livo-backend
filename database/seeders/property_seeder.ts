import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Property from '#models/property'
import Asset from '#models/asset'
import User from '#models/user'
import Agent from '#models/agent'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Get a real user to assign properties to
    // First try to get an agent/broker/developer, if not found create one
    let propertyOwner = await User.query()
      .whereIn('role', ['agent', 'broker', 'developer'])
      .first()

    if (!propertyOwner) {
      // If no agent exists, get any user or create one
      propertyOwner = await User.first()
      
      if (!propertyOwner) {
        // If no users exist at all, create a basic one
        propertyOwner = await User.create({
          firstName: 'Admin',
          lastName: 'Property',
          email: 'admin.property@livo.com',
          password: 'password123',
          role: 'developer',
          status: 'active'
        })
      }
    }

    const userId = propertyOwner.id
    
    // Get real agent IDs from the agents table
    const agents = await Agent.query().limit(5)
    
    const agentIds = agents.length > 0 ? agents.map(agent => agent.id) : []
    
    // Helper function to get agent ID safely
    const getAgentId = (index: number) => {
      if (agentIds.length === 0) return null
      return agentIds[index % agentIds.length]
    }

    // Generate proper UUIDs for properties
    const propertyIds = [
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      'f47ac10b-58cc-4372-a567-0e02b2c3d480',
      'f47ac10b-58cc-4372-a567-0e02b2c3d481',
      'f47ac10b-58cc-4372-a567-0e02b2c3d482',
      'f47ac10b-58cc-4372-a567-0e02b2c3d483',
      'f47ac10b-58cc-4372-a567-0e02b2c3d484',
      'f47ac10b-58cc-4372-a567-0e02b2c3d485',
      'f47ac10b-58cc-4372-a567-0e02b2c3d486'
    ]

    const properties = [
      {
        id: propertyIds[0],
        userId: userId,
        agentId: getAgentId(0),
        title: 'Casa de Lujo en Barrio Salamanca',
        description: 'Espectacular casa de 4 plantas en una de las zonas más exclusivas de Madrid. Completamente renovada con acabados de primera calidad.',
        categories: ['Houses', 'Luxury'],
        listingType: 'sale',
        listingStatus: 'active',
        propertyStatus: 'published',
        price: 2500000,
        yearlyTaxRate: 12500,
        afterPriceLabel: 'Precio negociable',
        address: 'Calle Serrano 145, Madrid',
        city: 'Madrid',
        state: 'Madrid',
        country: 'España',
        zip: '28006',
        neighborhood: 'Barrio de Salamanca',
        latitude: 40.4268776,
        longitude: -3.6759763,
        sizeSqft: 4500,
        lotSizeSqft: 800,
        rooms: 6,
        bedrooms: 4,
        bathrooms: 3,
        garages: 2,
        garageSize: '40 m²',
        yearBuilt: 2018,
        availableFrom: DateTime.now().plus({ days: 30 }),
        basement: 'Finished basement with wine cellar',
        extraDetails: 'Terraza de 50m², chimenea, sistema domótica',
        roofing: 'Tile',
        exteriorMaterial: 'Brick and stone',
        structureType: 'Detached',
        amenities: ['Swimming Pool', 'Garden', 'Garage', 'Terrace', 'Fireplace', 'Air Conditioning'],
        virtualTourUrl: 'https://my.matterport.com/show/?m=example1',
        isFeatured: true,
        viewsCount: 156,
        mlsNumber: 'MLS-001'
      },
      {
        id: propertyIds[1],
        userId: userId,
        agentId: getAgentId(1),
        title: 'Apartamento Moderno en Eixample',
        description: 'Elegante apartamento de 3 habitaciones en el corazón del Eixample barcelonés. Totalmente equipado y listo para entrar a vivir.',
        categories: ['Apartments', 'Modern'],
        listingType: 'rent',
        listingStatus: 'active',
        propertyStatus: 'published',
        price: 2800,
        afterPriceLabel: 'por mes',
        address: 'Carrer de Balmes 234, Barcelona',
        city: 'Barcelona',
        state: 'Cataluña',
        country: 'España',
        zip: '08006',
        neighborhood: 'Eixample',
        latitude: 41.3925182,
        longitude: 2.1653962,
        sizeSqft: 1800,
        rooms: 4,
        bedrooms: 3,
        bathrooms: 2,
        garages: 1,
        yearBuilt: 2020,
        availableFrom: DateTime.now().plus({ days: 15 }),
        extraDetails: 'Balcón, ascensor, calefacción central',
        amenities: ['Elevator', 'Balcony', 'Central Heating', 'Parking'],
        isFeatured: false,
        viewsCount: 89,
        mlsNumber: 'MLS-002'
      },
      {
        id: propertyIds[2],
        userId: userId,
        agentId: getAgentId(2),
        title: 'Villa Mediterránea con Vistas al Mar',
        description: 'Impresionante villa con vistas panorámicas al Mediterráneo. Piscina infinita, jardín tropical y acceso directo a la playa.',
        categories: ['Villa', 'Beachfront'],
        listingType: 'sale',
        listingStatus: 'active',
        propertyStatus: 'published',
        price: 3800000,
        yearlyTaxRate: 19000,
        afterPriceLabel: 'Vista al mar incluida',
        address: 'Paseo Marítimo 89, Valencia',
        city: 'Valencia',
        state: 'Valencia',
        country: 'España',
        zip: '46011',
        neighborhood: 'La Malvarrosa',
        latitude: 39.4840108,
        longitude: -0.3268116,
        sizeSqft: 6200,
        lotSizeSqft: 1500,
        rooms: 8,
        bedrooms: 5,
        bathrooms: 4,
        garages: 3,
        garageSize: '60 m²',
        yearBuilt: 2019,
        availableFrom: DateTime.now().plus({ days: 60 }),
        basement: 'Wine cellar and spa area',
        extraDetails: 'Piscina infinita, jacuzzi, jardín de 800m²',
        amenities: ['Swimming Pool', 'Ocean View', 'Garden', 'Spa', 'Wine Cellar', 'Beach Access'],
        virtualTourUrl: 'https://my.matterport.com/show/?m=example3',
        isFeatured: true,
        viewsCount: 234,
        mlsNumber: 'MLS-003'
      },
      {
        id: propertyIds[3],
        userId: userId,
        agentId: null, // No agent assigned
        title: 'Oficina Corporativa en Centro Histórico',
        description: 'Moderna oficina en edificio histórico rehabilitado. Perfecta para startups y empresas tecnológicas.',
        categories: ['Office', 'Commercial'],
        listingType: 'rent',
        listingStatus: 'active',
        propertyStatus: 'published',
        price: 4500,
        afterPriceLabel: 'por mes + gastos',
        address: 'Calle Sierpes 67, Sevilla',
        city: 'Sevilla',
        state: 'Andalucía',
        country: 'España',
        zip: '41004',
        neighborhood: 'Centro Histórico',
        latitude: 37.3886303,
        longitude: -5.9953403,
        sizeSqft: 2200,
        rooms: 6,
        yearBuilt: 1920,
        availableFrom: DateTime.now().plus({ days: 10 }),
        extraDetails: 'Techos altos, vigas vistas, completamente renovada',
        amenities: ['High Ceilings', 'Historic Building', 'Modern Renovations', 'Central Location'],
        isFeatured: false,
        viewsCount: 67,
        mlsNumber: 'MLS-004'
      },
      {
        id: propertyIds[4],
        userId: userId,
        agentId: getAgentId(3),
        title: 'Nave Industrial con Logística',
        description: 'Amplia nave industrial con facilidades logísticas. Ideal para almacenamiento y distribución.',
        categories: ['Industrial', 'Warehouse'],
        listingType: 'sale',
        listingStatus: 'active',
        propertyStatus: 'published',
        price: 1200000,
        yearlyTaxRate: 6000,
        address: 'Polígono Industrial Zona Franca, Barcelona',
        city: 'Barcelona',
        state: 'Cataluña',
        country: 'España',
        zip: '08040',
        neighborhood: 'Zona Franca',
        latitude: 41.3473374,
        longitude: 2.1348608,
        sizeSqft: 15000,
        lotSizeSqft: 20000,
        rooms: 2,
        bathrooms: 2,
        yearBuilt: 2015,
        availableFrom: DateTime.now().plus({ days: 45 }),
        extraDetails: 'Muelles de carga, oficinas anexas, parking para camiones',
        amenities: ['Loading Docks', 'Office Space', 'Truck Parking', 'High Ceilings'],
        isFeatured: false,
        viewsCount: 45,
        mlsNumber: 'MLS-005'
      },
      {
        id: propertyIds[5],
        userId: userId,
        agentId: getAgentId(4),
        title: 'Apartamento Estudios Universitarios',
        description: 'Moderno apartamento ideal para estudiantes. Ubicado cerca de las principales universidades.',
        categories: ['Apartments', 'Student Housing'],
        listingType: 'rent',
        listingStatus: 'active',
        propertyStatus: 'published',
        price: 1200,
        afterPriceLabel: 'por mes todo incluido',
        address: 'Calle Iparraguirre 45, Bilbao',
        city: 'Bilbao',
        state: 'País Vasco',
        country: 'España',
        zip: '48011',
        neighborhood: 'Abando',
        latitude: 43.2633651,
        longitude: -2.9346842,
        sizeSqft: 800,
        rooms: 2,
        bedrooms: 1,
        bathrooms: 1,
        yearBuilt: 2021,
        availableFrom: DateTime.now().plus({ days: 5 }),
        extraDetails: 'Totalmente amueblado, internet incluido',
        amenities: ['Furnished', 'Internet Included', 'Near Universities', 'Public Transport'],
        isFeatured: false,
        viewsCount: 78,
        mlsNumber: 'MLS-006'
      },
      {
        id: propertyIds[6],
        userId: userId,
        agentId: null, // No agent assigned
        title: 'Casa Rural con Finca',
        description: 'Encantadora casa rural con 5 hectáreas de terreno. Perfecta para turismo rural o residencia permanente.',
        categories: ['Houses', 'Rural'],
        listingType: 'sale',
        listingStatus: 'active',
        propertyStatus: 'published',
        price: 850000,
        yearlyTaxRate: 4250,
        address: 'Camino de la Dehesa s/n, Toledo',
        city: 'Toledo',
        state: 'Castilla-La Mancha',
        country: 'España',
        zip: '45001',
        neighborhood: 'Afueras',
        latitude: 39.8628316,
        longitude: -4.0273231,
        sizeSqft: 3200,
        lotSizeSqft: 50000,
        rooms: 7,
        bedrooms: 4,
        bathrooms: 3,
        garages: 2,
        yearBuilt: 1995,
        availableFrom: DateTime.now().plus({ days: 20 }),
        basement: 'Stone cellar',
        extraDetails: 'Olivos, huerto, pozo de agua, establos',
        amenities: ['Large Land', 'Olive Trees', 'Water Well', 'Stables', 'Garden'],
        isFeatured: false,
        viewsCount: 112,
        mlsNumber: 'MLS-007'
      },
      {
        id: propertyIds[7],
        userId: userId,
        agentId: getAgentId(0),
        title: 'Penthouse de Lujo con Terraza',
        description: 'Exclusivo penthouse en la Gran Vía madrileña. Terraza de 200m² con vistas de 360°.',
        categories: ['Apartments', 'Luxury', 'Penthouse'],
        listingType: 'sale',
        listingStatus: 'active',
        propertyStatus: 'published',
        price: 4200000,
        yearlyTaxRate: 21000,
        afterPriceLabel: 'Vistas únicas',
        address: 'Gran Vía 28, Madrid',
        city: 'Madrid',
        state: 'Madrid',
        country: 'España',
        zip: '28013',
        neighborhood: 'Centro',
        latitude: 40.4200727,
        longitude: -3.7089424,
        sizeSqft: 3500,
        rooms: 5,
        bedrooms: 3,
        bathrooms: 3,
        garages: 2,
        yearBuilt: 2022,
        availableFrom: DateTime.now().plus({ days: 90 }),
        extraDetails: 'Terraza de 200m², jacuzzi exterior, sistema domótica',
        amenities: ['Terrace', 'City Views', 'Jacuzzi', 'Smart Home', 'Concierge'],
        virtualTourUrl: 'https://my.matterport.com/show/?m=example8',
        isFeatured: true,
        viewsCount: 298,
        mlsNumber: 'MLS-008'
      }
    ]

    // Clear existing properties for this user
    await Property.query().where('user_id', userId).delete()

    // Insert new properties
    const createdProperties = await Property.createMany(properties)

    // Create some sample assets (images) for the first few properties
    const sampleAssets = [
      // Property 1 - Casa de Lujo
      {
        propertyId: propertyIds[0],
        type: 'image',
        fileName: 'luxury-house-1.jpg',
        filePath: '/images/listings/luxury-house-1.jpg',
        fileUrl: '/images/listings/luxury-house-1.jpg',
        sortOrder: 0,
        isFeatured: true,
        metadata: { floorLabel: 'ground-floor' }
      },
      {
        propertyId: propertyIds[0],
        type: 'image',
        fileName: 'luxury-house-2.jpg',
        filePath: '/images/listings/luxury-house-2.jpg',
        fileUrl: '/images/listings/luxury-house-2.jpg',
        sortOrder: 1,
        isFeatured: false,
        metadata: { floorLabel: 'first-floor' }
      },
      // Property 2 - Apartamento Barcelona
      {
        propertyId: propertyIds[1],
        type: 'image',
        fileName: 'apartment-bcn-1.jpg',
        filePath: '/images/listings/apartment-bcn-1.jpg',
        fileUrl: '/images/listings/apartment-bcn-1.jpg',
        sortOrder: 0,
        isFeatured: true,
        metadata: { floorLabel: 'main-floor' }
      },
      // Property 3 - Villa Valencia
      {
        propertyId: propertyIds[2],
        type: 'image',
        fileName: 'villa-valencia-1.jpg',
        filePath: '/images/listings/villa-valencia-1.jpg',
        fileUrl: '/images/listings/villa-valencia-1.jpg',
        sortOrder: 0,
        isFeatured: true,
        metadata: { floorLabel: 'ground-floor' }
      },
      {
        propertyId: propertyIds[2],
        type: 'image',
        fileName: 'villa-valencia-pool.jpg',
        filePath: '/images/listings/villa-valencia-pool.jpg',
        fileUrl: '/images/listings/villa-valencia-pool.jpg',
        sortOrder: 1,
        isFeatured: false,
        metadata: { floorLabel: 'exterior' }
      }
    ]

    // Clear existing assets for these properties
    await Asset.query().whereIn('property_id', properties.map(p => p.id)).delete()

    // Insert sample assets
    await Asset.createMany(sampleAssets)

    console.log(`✅ Created ${properties.length} properties for user ${userId}`)
    console.log(`✅ Assigned agents to ${properties.filter(p => p.agentId).length} properties`)
    console.log(`✅ Created ${sampleAssets.length} sample assets`)
  }
}