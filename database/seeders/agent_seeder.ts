import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Agent from '#models/agent'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    // Clear existing data
    await Agent.query().delete()

    // Insert sample agents
    const agents = [
      {
        id: 'agent-1',
        name: 'María González',
        email: 'maria.gonzalez@livo.com',
        image: '/images/team/agent-1.jpg',
        city: 'Madrid',
        category: 'Houses',
        company: 'Livo Real Estate',
        brokerAddress: 'Calle Gran Vía 123, Madrid',
        phone1: '+34 911 234 567',
        phone2: '+34 611 234 567',
        officePhone: '+34 911 234 568',
        mobilePhone: '+34 611 234 567',
        website: 'https://livo.com/agents/maria-gonzalez',
        memberSince: DateTime.fromISO('2020-01-15'),
        rating: 4.8,
        reviewsCount: 127,
        bio: 'Especialista en propiedades residenciales con más de 5 años de experiencia en el mercado inmobiliario de Madrid.',
        socialMedia: {
          facebook: 'https://facebook.com/maria.gonzalez.realtor',
          linkedin: 'https://linkedin.com/in/maria-gonzalez-realtor',
          instagram: 'https://instagram.com/maria_gonzalez_homes'
        },
        isActive: true
      },
      {
        id: 'agent-2',
        name: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@livo.com',
        image: '/images/team/agent-2.jpg',
        city: 'Barcelona',
        category: 'Apartments',
        company: 'Livo Real Estate',
        brokerAddress: 'Passeig de Gràcia 456, Barcelona',
        phone1: '+34 932 345 678',
        phone2: '+34 622 345 678',
        officePhone: '+34 932 345 679',
        mobilePhone: '+34 622 345 678',
        website: 'https://livo.com/agents/carlos-rodriguez',
        memberSince: DateTime.fromISO('2019-03-20'),
        rating: 4.6,
        reviewsCount: 89,
        bio: 'Experto en apartamentos de lujo y propiedades comerciales en el centro de Barcelona.',
        socialMedia: {
          linkedin: 'https://linkedin.com/in/carlos-rodriguez-realtor',
          twitter: 'https://twitter.com/carlos_homes_bcn'
        },
        isActive: true
      },
      {
        id: 'agent-3',
        name: 'Ana Martínez',
        email: 'ana.martinez@livo.com',
        image: '/images/team/agent-3.jpg',
        city: 'Valencia',
        category: 'Villa',
        company: 'Livo Real Estate',
        brokerAddress: 'Calle Colón 789, Valencia',
        phone1: '+34 963 456 789',
        phone2: '+34 633 456 789',
        officePhone: '+34 963 456 790',
        mobilePhone: '+34 633 456 789',
        website: 'https://livo.com/agents/ana-martinez',
        memberSince: DateTime.fromISO('2021-06-10'),
        rating: 4.9,
        reviewsCount: 156,
        bio: 'Especialista en villas de lujo y propiedades exclusivas en la costa valenciana.',
        socialMedia: {
          facebook: 'https://facebook.com/ana.martinez.luxury',
          instagram: 'https://instagram.com/ana_luxury_villas',
          linkedin: 'https://linkedin.com/in/ana-martinez-luxury-real-estate'
        },
        isActive: true
      },
      {
        id: 'agent-4',
        name: 'Diego López',
        email: 'diego.lopez@livo.com',
        image: '/images/team/agent-4.jpg',
        city: 'Sevilla',
        category: 'Office',
        company: 'Livo Real Estate',
        brokerAddress: 'Avenida de la Constitución 321, Sevilla',
        phone1: '+34 954 567 890',
        phone2: '+34 644 567 890',
        officePhone: '+34 954 567 891',
        mobilePhone: '+34 644 567 890',
        website: 'https://livo.com/agents/diego-lopez',
        memberSince: DateTime.fromISO('2018-09-05'),
        rating: 4.5,
        reviewsCount: 203,
        bio: 'Consultor especializado en propiedades comerciales y espacios de oficina en Sevilla.',
        socialMedia: {
          linkedin: 'https://linkedin.com/in/diego-lopez-commercial-realtor'
        },
        isActive: true
      },
      {
        id: 'agent-5',
        name: 'Isabel Fernández',
        email: 'isabel.fernandez@livo.com',
        image: '/images/team/agent-5.jpg',
        city: 'Bilbao',
        category: 'Industrial',
        company: 'Livo Real Estate',
        brokerAddress: 'Gran Vía Don Diego López de Haro 654, Bilbao',
        phone1: '+34 944 678 901',
        phone2: '+34 655 678 901',
        officePhone: '+34 944 678 902',
        mobilePhone: '+34 655 678 901',
        website: 'https://livo.com/agents/isabel-fernandez',
        memberSince: DateTime.fromISO('2017-11-12'),
        rating: 4.7,
        reviewsCount: 78,
        bio: 'Experta en propiedades industriales y logísticas en el País Vasco.',
        socialMedia: {
          linkedin: 'https://linkedin.com/in/isabel-fernandez-industrial-real-estate'
        },
        isActive: true
      }
    ]

    await Agent.createMany(agents as any)
  }
}