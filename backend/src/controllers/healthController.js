import { getHealthStatus } from '../services/healthService.js';

export async function getHealth(request, response) {
  const healthStatus = await getHealthStatus();
  response.status(200).json(healthStatus);
}
