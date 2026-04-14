import { vec3, mat4, vec4 } from 'gl-matrix';

/**
 * 射线拾取系统
 * 用于获取鼠标点击处的地形角点
 */
export class TerrainPicker {
  private rayOrigin = vec3.create();
  private rayDirection = vec3.create();

  constructor(
    private viewer: any,
    private corners: any[][],
    private mapSize: Int32Array,
    private centerOffset: Float32Array,
  ) {}

  /**
   * 从屏幕坐标计算射线
   */
  getRayFromScreen(screenX: number, screenY: number): { origin: vec3; direction: vec3 } {
    const camera = this.viewer.scenes[0].camera;
    const canvas = this.viewer.canvas;

    // 归一化设备坐标 (NDC)
    const x = (2.0 * screenX) / canvas.width - 1.0;
    const y = 1.0 - (2.0 * screenY) / canvas.height;
    const z = 1.0;

    // 反向投影：从裁剪空间到世界空间
    const viewProjInverse = mat4.create();
    if (!mat4.invert(viewProjInverse, camera.viewProjectionMatrix)) {
      vec3.set(this.rayOrigin, 0, 0, 0);
      vec3.set(this.rayDirection, 0, 0, -1);
      return {
        origin: this.rayOrigin,
        direction: this.rayDirection,
      };
    }

    const nearClip = vec4.fromValues(x, y, -1.0, 1.0);
    const farClip = vec4.fromValues(x, y, 1.0, 1.0);
    const nearWorld = vec4.create();
    const farWorld = vec4.create();

    vec4.transformMat4(nearWorld, nearClip, viewProjInverse);
    vec4.transformMat4(farWorld, farClip, viewProjInverse);

    if (nearWorld[3] !== 0) {
      nearWorld[0] /= nearWorld[3];
      nearWorld[1] /= nearWorld[3];
      nearWorld[2] /= nearWorld[3];
    }

    if (farWorld[3] !== 0) {
      farWorld[0] /= farWorld[3];
      farWorld[1] /= farWorld[3];
      farWorld[2] /= farWorld[3];
    }

    vec3.set(this.rayOrigin, nearWorld[0], nearWorld[1], nearWorld[2]);
    vec3.set(this.rayDirection, farWorld[0] - nearWorld[0], farWorld[1] - nearWorld[1], farWorld[2] - nearWorld[2]);
    vec3.normalize(this.rayDirection, this.rayDirection);

    return {
      origin: this.rayOrigin,
      direction: this.rayDirection,
    };
  }

  /**
   * 射线与地形相交检测
   * 返回已拾取的角点 (column, row) 和世界坐标
   */
  pickTerrain(screenX: number, screenY: number): {
    column: number;
    row: number;
    worldPos: vec3;
    height: number;
  } | null {
    const ray = this.getRayFromScreen(screenX, screenY);

    const [columns, rows] = this.mapSize;
    const corners = this.corners;

    // 优化：先用射线与平均地面平面相交，缩小搜索范围
    // 地面平面 Z ≈ 0（大多数 groundHeight 接近 0），法线 (0,0,1)
    const searchRadius = 20; // 搜索半径（格子数）
    let xMin = 0, xMax = columns - 2, yMin = 0, yMax = rows - 2;

    if (ray.direction[2] !== 0) {
      // 射线与 Z=0 平面相交：t = -origin.z / direction.z
      const t = -ray.origin[2] / ray.direction[2];
      if (t > 0) {
        const hitX = ray.origin[0] + ray.direction[0] * t;
        const hitY = ray.origin[1] + ray.direction[1] * t;
        // 从世界坐标换算回格子索引
        const approxCol = (hitX - this.centerOffset[0]) / 128;
        const approxRow = (hitY - this.centerOffset[1]) / 128;
        xMin = Math.max(0, Math.floor(approxCol - searchRadius));
        xMax = Math.min(columns - 2, Math.ceil(approxCol + searchRadius));
        yMin = Math.max(0, Math.floor(approxRow - searchRadius));
        yMax = Math.min(rows - 2, Math.ceil(approxRow + searchRadius));
      }
    }

    let closestDist = Infinity;
    let result = null;

    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        // 四个角点
        const p0 = this.getCornerWorldPos(x, y);
        const p1 = this.getCornerWorldPos(x + 1, y);
        const p2 = this.getCornerWorldPos(x, y + 1);
        const p3 = this.getCornerWorldPos(x + 1, y + 1);

        // 两个三角形：(p0, p1, p2) 和 (p1, p3, p2)
        const triangles = [
          [p0, p1, p2],
          [p1, p3, p2],
        ];

        for (const [a, b, c] of triangles) {
          const hitDist = this.rayTriangleIntersection(ray.origin, ray.direction, a, b, c);

          if (hitDist !== null && hitDist < closestDist) {
            closestDist = hitDist;

            // 计算交点
            const hitPoint = vec3.create();
            vec3.scaleAndAdd(hitPoint, ray.origin, ray.direction, hitDist);

            // 查找最近的角点
            const nearest = this.findNearestCorner(hitPoint, x, y);
            result = {
              column: nearest.column,
              row: nearest.row,
              worldPos: hitPoint,
              height: corners[nearest.row][nearest.column].groundHeight,
            };
          }
        }
      }
    }

    return result;
  }

  /**
   * Möller–Trumbore 射线-三角形相交算法
   */
  private rayTriangleIntersection(
    rayOrigin: vec3,
    rayDir: vec3,
    v0: vec3,
    v1: vec3,
    v2: vec3,
  ): number | null {
    const epsilon = 0.0000001;
    const edge1 = vec3.create();
    const edge2 = vec3.create();
    const h = vec3.create();
    const s = vec3.create();
    const q = vec3.create();

    vec3.subtract(edge1, v1, v0);
    vec3.subtract(edge2, v2, v0);

    vec3.cross(h, rayDir, edge2);
    const a = vec3.dot(edge1, h);

    if (a > -epsilon && a < epsilon) {
      return null; // 射线与三角形平行
    }

    const f = 1.0 / a;
    vec3.subtract(s, rayOrigin, v0);
    const u = f * vec3.dot(s, h);

    if (u < 0.0 || u > 1.0) {
      return null;
    }

    vec3.cross(q, s, edge1);
    const v = f * vec3.dot(rayDir, q);

    if (v < 0.0 || u + v > 1.0) {
      return null;
    }

    const t = f * vec3.dot(edge2, q);

    if (t > epsilon) {
      return t;
    }

    return null;
  }

  /**
   * 获取角点的世界坐标
   */
  private getCornerWorldPos(column: number, row: number): vec3 {
    const corner = this.corners[row][column];
    // 坐标必须与 ground.vert shader 一致:
    // gl_Position = u_VP * vec4(base * 128.0 + u_offset, height * 128.0, 1.0)
    return vec3.fromValues(
      column * 128 + this.centerOffset[0],
      row * 128 + this.centerOffset[1],
      (corner.groundHeight + corner.layerHeight - 2) * 128,
    );
  }

  /**
   * 找到最近的角点
   */
  private findNearestCorner(
    hitPoint: vec3,
    gridX: number,
    gridY: number,
  ): { column: number; row: number } {
    let minDist = Infinity;
    let nearest = { column: gridX, row: gridY };

    // 检查 2×2 区域内的四个角点
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const col = gridX + dx;
        const row = gridY + dy;

        const cornerPos = this.getCornerWorldPos(col, row);
        const dist = vec3.distance(hitPoint, cornerPos);

        if (dist < minDist) {
          minDist = dist;
          nearest = { column: col, row };
        }
      }
    }

    return nearest;
  }
}
