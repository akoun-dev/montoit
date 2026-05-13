package ci.montoit.app.ml

import android.content.Context
import android.graphics.Bitmap
import org.tensorflow.lite.DataType
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.CompatibilityList
import org.tensorflow.lite.gpu.GpuDelegate
import org.tensorflow.lite.nnapi.NnApiDelegate
import org.tensorflow.lite.support.common.FileUtil
import org.tensorflow.lite.support.image.ImageProcessor
import org.tensorflow.lite.support.image.TensorImage
import org.tensorflow.lite.support.image.ops.ResizeOp
import org.tensorflow.lite.support.label.Category
import org.tensorflow.lite.support.label.TensorLabel
import org.tensorflow.lite.support.tensorbuffer.TensorBuffer
import java.io.IOException
import java.nio.ByteBuffer
import java.nio.ByteOrder

class TFLiteHelper(private val context: Context) {
    private var interpreter: Interpreter? = null
    private var gpuDelegate: GpuDelegate? = null
    private var nnApiDelegate: NnApiDelegate? = null
    
    fun loadModel(modelPath: String, useGPU: Boolean = true, useNNAPI: Boolean = false): Boolean {
        return try {
            val model = FileUtil.loadMappedFile(context, modelPath)
            
            val options = Interpreter.Options().apply {
                if (useGPU) {
                    val compatList = CompatibilityList()
                    if (compatList.isDelegateSupportedOnThisDevice) {
                        gpuDelegate = GpuDelegate(compatList.bestOptionsForThisDevice)
                        addDelegate(gpuDelegate)
                    }
                }
                
                if (useNNAPI) {
                    nnApiDelegate = NnApiDelegate()
                    addDelegate(nnApiDelegate)
                }
            }
            
            interpreter = Interpreter(model, options)
            true
        } catch (e: IOException) {
            e.printStackTrace()
            false
        }
    }
    
    fun runInference(bitmap: Bitmap, inputSize: Pair<Int, Int>): List<Category>? {
        if (interpreter == null) {
            throw IllegalStateException("Model not loaded. Call loadModel() first.")
        }
        
        // Preprocess the image
        val imageProcessor = ImageProcessor.Builder()
            .add(ResizeOp(inputSize.first, inputSize.second, ResizeOp.ResizeMethod.BILINEAR))
            .build()
        
        var tensorImage = TensorImage(DataType.FLOAT32)
        tensorImage.load(bitmap)
        tensorImage = imageProcessor.process(tensorImage)
        
        // Prepare input tensor
        val inputFeature0 = tensorImage.tensorBuffer
        
        // Prepare output tensor
        val outputShape = interpreter?.getOutputTensorShape(0) ?: return null
        val outputSize = outputShape.fold(1) { acc, i -> acc * i }
        val outputBuffer = TensorBuffer.createFixedSize(outputShape, DataType.FLOAT32)
        
        // Run inference
        interpreter?.run(inputFeature0.buffer, outputBuffer.buffer.rewind())
        
        // Get results
        val labelPath = "labels.txt" // You need to provide this file in assets
        return try {
            val labels = FileUtil.loadLabels(context, labelPath)
            TensorLabel(labels, outputBuffer).map { category ->
                Category(category.label, category.score)
            }.sortedByDescending { it.score }
        } catch (e: IOException) {
            e.printStackTrace()
            null
        }
    }
    
    fun close() {
        interpreter?.close()
        gpuDelegate?.close()
        nnApiDelegate?.close()
    }
}