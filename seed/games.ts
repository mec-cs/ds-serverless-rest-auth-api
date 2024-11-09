import { Game, UserProfile } from "../shared/types";

export const games: Game[] = [
    {
        gameId: "G001",
        userId: "user123",
        title: "Adventure Quest",
        genre: "RPG",
        description: "Embark on an epic adventure to save the kingdom from the ancient curse.",
        releaseYear: 2022,
        platform: ["PC", "PlayStation", "Xbox"],
        popularity: 87,
        sourceLanguage: "en",
    },
    {
        gameId: "G002",
        userId: "user123",
        title: "Mystery of the Ancients",
        genre: "Puzzle",
        description: "Solve ancient puzzles to uncover the secrets of a long-lost civilization.",
        releaseYear: 2021,
        platform: ["PC", "Nintendo Switch"],
        popularity: 75,
        sourceLanguage: "en",
    },
    {
        gameId: "G003",
        userId: "user234",
        title: "Space Odyssey",
        genre: "Sci-Fi",
        description: "Explore the vast universe and battle alien species to protect humanity.",
        releaseYear: 2003,
        platform: ["PC", "PlayStation"],
        popularity: 92,
        sourceLanguage: "en",
    },
    {
        gameId: "G004",
        userId: "user234",
        title: "Farm Frenzy",
        genre: "Simulation",
        description: "Manage a farm, grow crops, and raise animals in this relaxing simulation game.",
        releaseYear: 2015,
        platform: ["PC", "Mobile"],
        popularity: 65,
        sourceLanguage: "en",
    },
    {
        gameId: "G005",
        userId: "user567",
        title: "Battle Arena",
        genre: "Action",
        description: "Fight in a variety of arenas and prove your skills in intense battles.",
        releaseYear: 2014,
        platform: ["PC", "PlayStation", "Xbox", "Nintendo Switch"],
        popularity: 80,
        sourceLanguage: "en",
    },
    {
        gameId: "G006",
        userId: "user567",
        title: "Zombie Survival",
        genre: "Horror",
        description: "Survive against waves of zombies in a post-apocalyptic world.",
        releaseYear: 2021,
        platform: ["PC", "Xbox"],
        popularity: 78,
        sourceLanguage: "en",
    },
    {
        gameId: "G007",
        userId: "user123",
        title: "Magic Realms",
        genre: "Fantasy",
        description: "Journey through magical realms, mastering spells and defeating mythical creatures.",
        releaseYear: 2022,
        platform: ["PlayStation", "Nintendo Switch"],
        popularity: 85,
        sourceLanguage: "en",
    },
    {
        gameId: "G008",
        userId: "user567",
        title: "Galactic Conquest",
        genre: "Strategy",
        description: "Expand your empire across the galaxy in this strategic space simulation.",
        releaseYear: 2009,
        platform: ["PC", "Xbox"],
        popularity: 85,
        sourceLanguage: "en",
    },
    {
        gameId: "G009",
        userId: "user234",
        title: "Alien Invasion",
        genre: "Sci-Fi",
        description: "Defend Earth from alien invaders in this fast-paced action shooter.",
        releaseYear: 2012,
        platform: ["PC", "PlayStation", "Xbox"],
        popularity: 82,
        sourceLanguage: "en",
    },
    {
        gameId: "G010",
        userId: "user567",
        title: "Cyber Runner",
        genre: "Action",
        description: "Run through cyberpunk cities, dodging obstacles and fighting enemies.",
        releaseYear: 2013,
        platform: ["Mobile", "Nintendo Switch"],
        popularity: 83,
        sourceLanguage: "en",
    },
    {
        gameId: "G011",
        userId: "user123",
        title: "Medieval Kingdoms",
        genre: "Strategy",
        description: "Command armies and build your kingdom in a historical medieval setting.",
        releaseYear: 2008,
        platform: ["PC", "Mobile"],
        popularity: 70,
        sourceLanguage: "en",
    },
    {
        gameId: "G012",
        userId: "user567",
        title: "Space Colonization",
        genre: "Sci-Fi",
        description: "Establish and manage a human colony on a distant planet, overcoming various challenges.",
        releaseYear: 2003,
        platform: ["PC", "PlayStation", "Xbox"],
        popularity: 90,
        sourceLanguage: "en",
    }
];


export const users: UserProfile[] = [
    {
        userId: 'user123',
        username: 'alicejohnson21',
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        favoriteGenres: ['RPG', 'Adventure'],
    },
    {
        userId: 'user234',
        username: 'bobsmith87',
        name: 'Bob Smith',
        email: 'bob.smith@example.com',
        favoriteGenres: ['Puzzle', 'Survival'],
    },
    {
        userId: 'user567',
        username: 'ethanhunt007',
        name: 'Ethan Hunt',
        email: 'ethan.hunt@example.com',
        favoriteGenres: ['Action', 'Adventure'],
    }
];
