import { getMaterials as getMaterialsFromService } from '../services/materialService.js';

export async function getMaterials(request, response) {
  const materials = await getMaterialsFromService();
  response.status(200).json({ data: materials });
}
