'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const articles = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Santa Cruz LGU Launches Build Watch Platform',
        summary: 'The local government unit of Santa Cruz, Laguna has officially launched the Build Watch platform to promote transparency in infrastructure projects.',
        content: 'The Santa Cruz LGU has taken a significant step towards transparency and accountability with the launch of the Build Watch platform. This digital initiative allows citizens to track infrastructure and development projects in real-time, providing unprecedented access to project information, progress updates, and budget allocations.\n\nThe platform features an interactive map showing project locations, detailed progress reports, and comprehensive budget breakdowns. Mayor Santos emphasized that this initiative reflects the local government\'s commitment to open governance and citizen engagement.',
        author: 'LGU Communications Office',
        publishDate: new Date('2024-07-01'),
        imageUrl: '/slide-1.png',
        category: 'News',
        status: 'Published',
        tags: JSON.stringify(['transparency', 'digitalization', 'governance']),
        viewCount: 1250,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title: 'Major Road Project Reaches 65% Completion',
        summary: 'The rehabilitation of the main thoroughfare in Poblacion I is progressing well with 65% of the work completed ahead of schedule.',
        content: 'The road rehabilitation project in Poblacion I has reached a significant milestone with 65% completion achieved ahead of the projected timeline. The project, which involves the rehabilitation of a 2.5-kilometer stretch of the main thoroughfare, is expected to improve traffic flow and road safety in the area.\n\nProject Manager Engr. Maria Santos reported that the construction team has been working efficiently despite weather challenges. The project includes drainage improvements, street lighting upgrades, and sidewalk enhancements.',
        author: 'Engineering Department',
        publishDate: new Date('2024-07-05'),
        imageUrl: '/slide-2.png',
        category: 'Update',
        status: 'Published',
        tags: JSON.stringify(['infrastructure', 'road-rehabilitation', 'progress']),
        viewCount: 890,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        title: 'Public Market Renovation Project Approved',
        summary: 'The municipal council has approved the renovation project for the public market, expected to improve facilities for vendors and customers.',
        content: 'The Municipal Council has unanimously approved the public market renovation project, which will modernize the facility and improve the shopping experience for both vendors and customers. The project includes the installation of proper ventilation systems, improved lighting, and better waste management facilities.\n\nThe renovation will be completed in phases to minimize disruption to daily market operations. The project is expected to create temporary employment opportunities during construction.',
        author: 'Municipal Planning Office',
        publishDate: new Date('2024-07-10'),
        imageUrl: '/slide-3.png',
        category: 'Announcement',
        status: 'Published',
        tags: JSON.stringify(['market-renovation', 'facilities', 'approval']),
        viewCount: 756,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        title: 'New School Building to Serve 500 Students',
        summary: 'Construction of a new school building in Barangay Gatid is underway, which will accommodate 500 students when completed.',
        content: 'Construction has begun on a new school building in Barangay Gatid that will provide modern educational facilities for 500 students. The three-story building will include 15 classrooms, a library, computer laboratory, and multipurpose hall.\n\nThe project is funded through the Special Education Fund and is expected to be completed by the end of 2025. The new facility will help address classroom shortages and provide a better learning environment for students.',
        author: 'Education Department',
        publishDate: new Date('2024-07-15'),
        imageUrl: '/slide-4.png',
        category: 'News',
        status: 'Published',
        tags: JSON.stringify(['education', 'school-building', 'construction']),
        viewCount: 634,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440005',
        title: 'Water System Improvement Project Completed',
        summary: 'The water system improvement project in Barangay Bubukal has been successfully completed, providing clean water to 200 households.',
        content: 'The water system improvement project in Barangay Bubukal has been successfully completed, bringing clean and reliable water supply to 200 households. The project included the installation of new water pipes, construction of a water treatment facility, and upgrading of distribution systems.\n\nThe completion of this project addresses long-standing water supply issues in the barangay and improves the quality of life for residents. The project was completed on time and within budget.',
        author: 'Public Works Department',
        publishDate: new Date('2024-06-20'),
        imageUrl: '/slide-5.png',
        category: 'Update',
        status: 'Published',
        tags: JSON.stringify(['water-system', 'completed', 'infrastructure']),
        viewCount: 445,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440006',
        title: 'Health Center Upgrade Project Progress',
        summary: 'The health center upgrade project in Barangay Labuin is progressing well with 30% completion achieved.',
        content: 'The health center upgrade project in Barangay Labuin has reached 30% completion. The project includes the expansion of consultation rooms, installation of modern medical equipment, and improvement of waiting areas.\n\nThe upgraded facility will provide better healthcare services to residents and reduce the need to travel to the main hospital for basic medical care. The project is expected to be completed by October 2025.',
        author: 'Health Department',
        publishDate: new Date('2024-07-12'),
        imageUrl: '/slide-1.png',
        category: 'Update',
        status: 'Published',
        tags: JSON.stringify(['health-center', 'upgrade', 'progress']),
        viewCount: 321,
        isFeatured: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    await queryInterface.bulkInsert('articles', articles, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('articles', null, {});
  }
}; 