import test from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { Gender, RoomGenderType } from '../../common/constants/enums.js';
import type { IBed } from '../../models/bed.model.js';
import type { IRoom } from '../../models/room.model.js';
import type { IStudent } from '../../models/student.model.js';
import { __roomAssignmentTestUtils } from './roomAssignment.service.js';

type TestRoom = Parameters<typeof __roomAssignmentTestUtils.pickBestRoomIndexForStudent>[2][number];

function objectId() {
  return new Types.ObjectId();
}

function createStudent(studentCode: string, className: string, major: string, academicYear: string, department: string) {
  return {
    _id: objectId(),
    studentCode,
    fullName: studentCode,
    gender: Gender.FEMALE,
    className,
    major,
    academicYear,
    department,
  } as unknown as IStudent;
}

function createBeds(roomId: Types.ObjectId, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    _id: objectId(),
    roomId,
    bedNumber: `G${index + 1}`,
  })) as unknown as IBed[];
}

function createRoom(roomNumber: string, capacity = 8): TestRoom {
  const roomId = objectId();
  return {
    room: {
      _id: roomId,
      roomNumber,
      capacity,
      genderType: RoomGenderType.FEMALE,
      isFreshmanPriority: false,
    } as unknown as IRoom,
    floor: { floorNumber: 1, buildingId: objectId().toString() },
    buildingName: 'A',
    availableBeds: createBeds(roomId, capacity),
    occupants: [],
  };
}

function assignToRoom(room: TestRoom, student: IStudent, usedBeds: Set<string>) {
  const bed = room.availableBeds.find((item) => !usedBeds.has(item._id.toString()));
  assert.ok(bed, 'Phòng phải còn giường trống để gán sinh viên');

  usedBeds.add(bed._id.toString());
  room.occupants.push({
    className: student.className,
    major: student.major,
    academicYear: student.academicYear,
    department: student.department,
  });
}

test('ưu tiên lấp phòng đã mở trước khi mở phòng trống mới nếu không có phòng trùng tiêu chí', () => {
  const usedBeds = new Set<string>();
  const rooms = [createRoom('101'), createRoom('102')];
  const student = createStudent('N23DCDT001', 'L-103', 'Kỹ thuật điện tử', 'D23', 'Kỹ thuật Điện tử');

  rooms[0].occupants.push(
    { className: 'L-101', major: 'Công nghệ đa phương tiện', academicYear: 'D22', department: 'Đa phương tiện' },
    { className: 'L-101', major: 'Công nghệ đa phương tiện', academicYear: 'D22', department: 'Đa phương tiện' },
    { className: 'L-101', major: 'Công nghệ đa phương tiện', academicYear: 'D22', department: 'Đa phương tiện' },
  );

  const selectedRoomIndex = __roomAssignmentTestUtils.pickBestRoomIndexForStudent(student, [0, 1], rooms, usedBeds);

  assert.equal(selectedRoomIndex, 0);
});

test('xếp nhóm 3 sinh viên và nhóm 5 sinh viên cùng giới tính vào chung một phòng 8 giường', () => {
  const usedBeds = new Set<string>();
  const rooms = [createRoom('101'), createRoom('102')];
  const l101Students = [
    createStudent('N22DCPT001', 'L-101', 'Công nghệ đa phương tiện', 'D22', 'Đa phương tiện'),
    createStudent('N22DCPT002', 'L-101', 'Công nghệ đa phương tiện', 'D22', 'Đa phương tiện'),
    createStudent('N22DCPT003', 'L-101', 'Công nghệ đa phương tiện', 'D22', 'Đa phương tiện'),
  ];
  const l103Students = [
    createStudent('N23DCDT001', 'L-103', 'Kỹ thuật điện tử', 'D23', 'Kỹ thuật Điện tử'),
    createStudent('N23DCDT002', 'L-103', 'Kỹ thuật điện tử', 'D23', 'Kỹ thuật Điện tử'),
    createStudent('N23DCDT003', 'L-103', 'Kỹ thuật điện tử', 'D23', 'Kỹ thuật Điện tử'),
    createStudent('N23DCDT004', 'L-103', 'Kỹ thuật điện tử', 'D23', 'Kỹ thuật Điện tử'),
    createStudent('N23DCDT005', 'L-103', 'Kỹ thuật điện tử', 'D23', 'Kỹ thuật Điện tử'),
  ];

  for (const student of [...l101Students, ...l103Students]) {
    const selectedRoomIndex = __roomAssignmentTestUtils.pickBestRoomIndexForStudent(student, [0, 1], rooms, usedBeds);
    assert.equal(selectedRoomIndex, 0);
    assignToRoom(rooms[selectedRoomIndex], student, usedBeds);
  }

  assert.equal(rooms[0].occupants.length, 8);
  assert.equal(rooms[1].occupants.length, 0);
});

test('vẫn ưu tiên phòng trùng tiêu chí học tập hơn phòng chỉ có người nhưng không liên quan', () => {
  const usedBeds = new Set<string>();
  const rooms = [createRoom('101'), createRoom('102')];
  const student = createStudent('N24DCKT009', 'L-102', 'Kế toán', 'D24', 'Kế toán');

  rooms[0].occupants.push({ className: 'L-101', major: 'Công nghệ đa phương tiện', academicYear: 'D22', department: 'Đa phương tiện' });
  rooms[1].occupants.push({ className: 'L-102', major: 'Kế toán', academicYear: 'D24', department: 'Kế toán' });

  const selectedRoomIndex = __roomAssignmentTestUtils.pickBestRoomIndexForStudent(student, [0, 1], rooms, usedBeds);

  assert.equal(selectedRoomIndex, 1);
});
