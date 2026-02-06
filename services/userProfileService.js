const { PrismaClient } = require('../generated/prisma');

const prisma = new PrismaClient();

class UserProfileService {
  async getProfileByUserId(userId) {
    if (!userId) return null;
    return prisma.userProfile.findUnique({
      where: { id: userId }
    });
  }

  async upsertProfile(userId, profileData) {
    const { nova_money_api_key, nova_money_tenant } = profileData;

    return prisma.userProfile.upsert({
      where: { id: userId },
      update: {
        nova_money_api_key,
        nova_money_tenant
      },
      create: {
        id: userId,
        nova_money_api_key,
        nova_money_tenant
      }
    });
  }
}

module.exports = new UserProfileService();
