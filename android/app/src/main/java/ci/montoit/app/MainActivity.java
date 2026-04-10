package ci.montoit.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import ci.montoit.app.ml.TFLiteHelper;
import org.tensorflow.lite.support.label.Category;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private TFLiteHelper tfliteHelper;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Initialize TFLiteHelper
        tfliteHelper = new TFLiteHelper(this);
        
        // Load a model (you need to add your model file to assets)
        boolean modelLoaded = tfliteHelper.loadModel("model.tflite", true, false);
        
        if (modelLoaded) {
            Log.d("TFLite", "Model loaded successfully");
            
            // Example: Run inference on a sample image
            // You need to add an image to your drawable or assets folder
            Bitmap bitmap = BitmapFactory.decodeResource(getResources(), android.R.drawable.ic_menu_camera);
            if (bitmap != null) {
                List<Category> results = tfliteHelper.runInference(bitmap, new Pair<>(224, 224));
                if (results != null && !results.isEmpty()) {
                    Log.d("TFLite", "Top result: " + results.get(0).getLabel() + " (" + results.get(0).getScore() + ")");
                }
            }
        } else {
            Log.e("TFLite", "Failed to load model");
        }
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (tfliteHelper != null) {
            tfliteHelper.close();
        }
    }
}
