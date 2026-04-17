import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateDistance } from '../common/utils/distance.util';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private prisma: PrismaService) {}

  async create(createZoneDto: CreateZoneDto) {
    // Check if zone name already exists
    const existing = await this.prisma.zone.findUnique({
      where: { name: createZoneDto.name },
    });

    if (existing) {
      throw new BadRequestException('Zone name already exists');
    }

    // Validate: either polygon OR (minDistance and maxDistance) must be provided
    if (!createZoneDto.polygon && (!createZoneDto.minDistance || !createZoneDto.maxDistance)) {
      throw new BadRequestException('Either polygon or minDistance/maxDistance must be provided');
    }

    // If polygon is provided, validate it has at least 3 points
    if (createZoneDto.polygon && createZoneDto.polygon.length < 3) {
      throw new BadRequestException('Polygon must have at least 3 points');
    }

    return this.prisma.zone.create({
      data: {
        name: createZoneDto.name,
        minDistance: createZoneDto.minDistance,
        maxDistance: createZoneDto.maxDistance,
        price: createZoneDto.price,
        polygon: createZoneDto.polygon ? JSON.stringify(createZoneDto.polygon) : null,
      },
    });
  }

  async findAll() {
    const zones = await this.prisma.zone.findMany({
      orderBy: { name: 'asc' },
    });

    // Parse polygon JSON strings
    return zones.map(zone => ({
      ...zone,
      polygon: zone.polygon ? JSON.parse(zone.polygon) : null,
    }));
  }

  async findOne(id: string) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    // Parse polygon JSON string
    return {
      ...zone,
      polygon: zone.polygon ? JSON.parse(zone.polygon) : null,
    };
  }

  async update(id: string, updateZoneDto: UpdateZoneDto) {
    await this.findOne(id); // Verify zone exists

    if (updateZoneDto.name) {
      const existing = await this.prisma.zone.findUnique({
        where: { name: updateZoneDto.name },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException('Zone name already exists');
      }
    }

    // Validate polygon if provided
    if (updateZoneDto.polygon && updateZoneDto.polygon.length < 3) {
      throw new BadRequestException('Polygon must have at least 3 points');
    }

    const data: any = { ...updateZoneDto };
    if (updateZoneDto.polygon) {
      data.polygon = JSON.stringify(updateZoneDto.polygon);
    }

    const updated = await this.prisma.zone.update({
      where: { id },
      data,
    });

    return {
      ...updated,
      polygon: updated.polygon ? JSON.parse(updated.polygon) : null,
    };
  }

  async remove(id: string) {
    await this.findOne(id); // Verify zone exists

    // Check if zone is used in any orders
    const orders = await this.prisma.order.findMany({
      where: { zoneId: id },
    });

    if (orders.length > 0) {
      throw new BadRequestException('Cannot delete zone that has been used in orders');
    }

    return this.prisma.zone.delete({
      where: { id },
    });
  }

  /**
   * Find zone based on distance
   * @param distance Distance in kilometers
   * @returns Zone or null if distance exceeds all zones
   */
  async findZoneByDistance(distance: number) {
    const zone = await this.prisma.zone.findFirst({
      where: {
        minDistance: { lte: distance },
        maxDistance: { gte: distance },
      },
    });

    return zone;
  }

  /**
   * Calculate distance and find appropriate zone
   * @param pickupLat Latitude of pickup location
   * @param pickupLon Longitude of pickup location
   * @param deliveryLat Latitude of delivery location
   * @param deliveryLon Longitude of delivery location
   * @returns Object containing distance, zone, and fare
   */
  async calculateZoneAndFare(
    pickupLat: number,
    pickupLon: number,
    deliveryLat: number,
    deliveryLon: number,
  ) {
    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      pickupLat,
      pickupLon,
      deliveryLat,
      deliveryLon,
    );

    // Find appropriate zone
    const zone = await this.findZoneByDistance(distance);

    if (!zone) {
      throw new NotFoundException(
        `No zone found for distance ${distance} km. Maximum delivery distance is 10 km.`,
      );
    }

    return {
      distance,
      zone,
      fare: zone.price,
    };
  }
}

