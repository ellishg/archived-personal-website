/**
 *  @fileoverview file for generating terrain for flight simulator
 *  @author eshoag2@illinois.edu (Ellis Hoag)
 */


/**
 *  We generate our heightmap here using the diamond square algorithm.
 *  It is recursive and takes in the bounds and the size of our array.
 *  It also takes in the offset_mag which is the magnitude of our random offset
 *  for the center.
 *  The result will be different every time it runs because of Math.random().
 */
function generate_heightmap(heightmap, N, min_x, max_x, min_y, max_y, offset_mag) {

    var offset_mag_dropoff = 2;

    if (max_x - min_x <= 1 || max_y - min_y <= 1) {return;}

    var offset = offset_mag * (2 * Math.random() - 1);

    var mid_x = Math.floor((min_x + max_x) / 2);
    var mid_y = Math.floor((min_y + max_y) / 2);

    heightmap[mid_x][mid_y] = offset + (heightmap[min_x][min_y]
                                     + heightmap[min_x][max_y]
                                     + heightmap[max_x][min_y]
                                     + heightmap[max_x][max_y]) / 4;

    offset = offset_mag * (2 * Math.random() - 1);
    heightmap[mid_x][min_y] = offset + (heightmap[min_x][min_y]
                                        + heightmap[max_x][min_y]
                                        + heightmap[mid_x][(((min_y - mid_y) % N) + N) % N]
                                        + heightmap[mid_x][mid_y]) / 4;

    offset = offset_mag * (2 * Math.random() - 1);
    heightmap[max_x][mid_y] = offset + (heightmap[mid_x][mid_y]
                                        + heightmap[max_x][min_y]
                                        + heightmap[max_x][max_y]
                                        + heightmap[(max_x + mid_x) % N][mid_y]) / 4;

    offset = offset_mag * (2 * Math.random() - 1);
    heightmap[mid_x][max_y] = offset + (heightmap[mid_x][mid_y]
                                        + heightmap[max_x][max_y]
                                        + heightmap[min_x][max_y]
                                        + heightmap[mid_x][(max_y + mid_y) % N]) / 4;

    offset = offset_mag * (2 * Math.random() - 1);
    heightmap[min_x][mid_y] = offset + (heightmap[min_x][min_y]
                                        + heightmap[mid_x][mid_y]
                                        + heightmap[min_x][max_y]
                                        + heightmap[(((min_x - mid_x) % N) + N) % N][mid_y]) / 4;

    generate_heightmap(heightmap, N, min_x, mid_x, min_y, mid_y, offset_mag / offset_mag_dropoff);
    generate_heightmap(heightmap, N, min_x, mid_x, mid_y, max_y, offset_mag / offset_mag_dropoff);
    generate_heightmap(heightmap, N, mid_x, max_x, min_y, mid_y, offset_mag / offset_mag_dropoff);
    generate_heightmap(heightmap, N, mid_x, max_x, mid_y, max_y, offset_mag / offset_mag_dropoff);

}

/**
 *  We generate our normals here using our vertices and indices.
 *  We sum together all the normals of each vertex using its neighboring faces.
 *  Then we normalize them so that each vertex normal is the average of each
 *  of its neighboring faces.
 */
function generate_normals(normals, vertices, indices) {

    for (var i = 0; i < normals.length / 3; i++) {
        normals[3 * i + 0] = 0;
        normals[3 * i + 1] = 0;
        normals[3 * i + 2] = 0;
    }

    for (var i = 0; i < indices.length; i += 3) {

        var i0 = indices[i];
        var i1 = indices[i + 1];
        var i2 = indices[i + 2];

        var v0X = vertices[3 * i0 + 0];
        var v0Y = vertices[3 * i0 + 1];
        var v0Z = vertices[3 * i0 + 2];
        var v1X = vertices[3 * i1 + 0];
        var v1Y = vertices[3 * i1 + 1];
        var v1Z = vertices[3 * i1 + 2];
        var v2X = vertices[3 * i2 + 0];
        var v2Y = vertices[3 * i2 + 1];
        var v2Z = vertices[3 * i2 + 2];

        var aX = v1X - v0X;
        var aY = v1Y - v0Y;
        var aZ = v1Z - v0Z;

        var bX = v2X - v0X;
        var bY = v2Y - v0Y;
        var bZ = v2Z - v0Z;

        var normX = aY * bZ - aZ * bY;
        var normY = aZ * bX - aX * bZ;
        var normZ = aX * bY - aY * bX;

        var mag = Math.sqrt(normX * normX + normY * normY + normZ * normZ);

        normals[3 * i0 + 0] += normX / mag;
        normals[3 * i0 + 1] += normY / mag;
        normals[3 * i0 + 2] += normZ / mag;

        normals[3 * i1 + 0] += normX / mag;
        normals[3 * i1 + 1] += normY / mag;
        normals[3 * i1 + 2] += normZ / mag;

        normals[3 * i2 + 0] += normX / mag;
        normals[3 * i2 + 1] += normY / mag;
        normals[3 * i2 + 2] += normZ / mag;
    }


    for (var i = 0; i < normals.length / 3; i++) {
        var normX = normals[3 * i + 0];
        var normY = normals[3 * i + 1];
        var normZ = normals[3 * i + 2];

        var mag = Math.sqrt(normX * normX + normY * normY + normZ * normZ);

        normals[3 * i + 0] += normX / mag;
        normals[3 * i + 1] += normY / mag;
        normals[3 * i + 2] += normZ / mag;
    }
}

//-------------------------------------------------------------------------
/**
 *  We generate our terrain here. It generates its vertices, color, normals, and indices.
 *  We generate our heightmap here.
 *  The colors are generated based on height. The lowest points are blue, then green, then gray, then white.
 *  Our indices are generated based on how we ordered our vertices.
 *  We also compute our normals here.
 */
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, colorArray, faceArray, normalArray)
{
    var heightmap = new Array(n + 1);
    for (i = 0; i <= n; i++) {
         heightmap[i] = new Array(n + 1);
         for (j = 0; j <= n; j++) {
            heightmap[i][j] = 0;
         }
    }
    
    generate_heightmap(heightmap, n + 1, 0, n, 0, n, 0.5);
    
    for (i = 0; i <= n; i++) {
        heightmap[0][i] = 0;
        heightmap[i][0] = 0;
        heightmap[n][i] = 0;
        heightmap[i][n] = 0;
    }

    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    for(var i=0;i<=n;i++) {
       for(var j=0;j<=n;j++) {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(minY+deltaY*i);
           vertexArray.push(heightmap[i][j]);

           var rand_r = (Math.random() - 0.5) / 5.0;
           var rand_g = (Math.random() - 0.5) / 5.0;
           var rand_b = (Math.random() - 0.5) / 5.0;

           if (heightmap[i][j] < -0.15) {
             colorArray.push(0.0 + rand_r);
             colorArray.push(0.0 + rand_g);
             colorArray.push(1.0 + rand_b);
           }
           else if (heightmap[i][j] < 0.1) {
             colorArray.push(0.0 + rand_r);
             colorArray.push(1.0 + rand_g);
             colorArray.push(0.0 + rand_b);
           }
           else if (heightmap[i][j] < 0.2) {
             colorArray.push(0.3 + rand_r);
             colorArray.push(0.3 + rand_g);
             colorArray.push(0.3 + rand_b);
           }
           else  {
             colorArray.push(0.7);
             colorArray.push(0.7);
             colorArray.push(0.7);
           }

           normalArray.push(0);
           normalArray.push(0);
           normalArray.push(1);
       }
    }

    var numT=0;
    for(var i=0;i<n;i++) {
       for(var j=0;j<n;j++) {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);

           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    }

    generate_normals(normalArray, vertexArray, faceArray)

    return numT;
}
