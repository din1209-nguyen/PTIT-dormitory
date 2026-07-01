import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Building } from '../models/building.model.js';
import { Floor } from '../models/floor.model.js';
import { Room } from '../models/room.model.js';
import { Bed } from '../models/bed.model.js';
import { RoomGenderType, BedStatus } from '../common/constants/enums.js';

const BUILDINGS = [
  { name: 'J', genderType: RoomGenderType.MALE, capacity: 8 },
  { name: 'K', genderType: RoomGenderType.MALE, capacity: 8 },
  { name: 'L', genderType: RoomGenderType.FEMALE, capacity: 12 },
  { name: 'M', genderType: RoomGenderType.FEMALE, capacity: 12 },
];

const FLOORS_PER_BUILDING = 5;
const ROOMS_PER_FLOOR = 4;
const FRESHMAN_PRIORITY_BUILDING = 'J';
const FRESHMAN_PRIORITY_ROOMS_PER_FLOOR = 2;

export async function seedDormitory() {
  let totalRooms = 0;
  let totalBeds = 0;

  for (const b of BUILDINGS) {
    let building = await Building.findOne({ name: b.name });
    if (!building) {
      building = await Building.create({ name: b.name, description: `Dãy ${b.name}`, status: 'ACTIVE' });
    }

    for (let f = 1; f <= FLOORS_PER_BUILDING; f++) {
      let floor = await Floor.findOne({ buildingId: building._id, floorNumber: f });
      if (!floor) {
        floor = await Floor.create({ buildingId: building._id, floorNumber: f });
      }

      for (let r = 1; r <= ROOMS_PER_FLOOR; r++) {
        const roomNumber = `${f}${String(r).padStart(2, '0')}`;
        const isFreshmanPriority = b.name === FRESHMAN_PRIORITY_BUILDING && r <= FRESHMAN_PRIORITY_ROOMS_PER_FLOOR;

        let room = await Room.findOne({ floorId: floor._id, roomNumber });
        if (!room) {
          room = await Room.create({
            floorId: floor._id,
            roomNumber,
            capacity: b.capacity,
            genderType: b.genderType,
            isFreshmanPriority,
          });
          totalRooms++;

          const beds = Array.from({ length: b.capacity }, (_, i) => ({
            roomId: room!._id,
            bedNumber: `G${i + 1}`,
            status: BedStatus.AVAILABLE,
          }));
          await Bed.insertMany(beds);
          totalBeds += beds.length;
        }
      }
    }
  }

  console.log(`  ✓ 4 buildings, ${totalRooms} rooms, ${totalBeds} beds`);
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected to MongoDB');
  await seedDormitory();
  await mongoose.disconnect();
  console.log('Done');
}

if (process.argv[1]?.includes('seedDormitory')) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
